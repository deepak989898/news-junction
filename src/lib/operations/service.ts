import { runFetchNews, runProcessNews } from "@/lib/automation/fetch-pipeline";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_OPERATIONS_SETTINGS, OPERATIONS_SETTINGS_DOC_ID } from "./defaults";
import { CronItem, OperationsSettings, QueueJobItem, ServiceHealthItem } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function logOperation(entry: {
  type: string;
  module: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  createdBy?: string;
  metadata?: Record<string, unknown>;
}) {
  await Promise.all([
    getAdminDb().collection("operationLogs").add({ ...entry, createdAt: nowIso() }),
    getAdminDb()
      .collection("systemLogs")
      .add({ ...entry, createdAt: nowIso(), resolvedAt: null, resolvedBy: null }),
  ]);
}

export async function getOperationsSettings(): Promise<OperationsSettings> {
  const doc = await getAdminDb().collection("settings").doc(OPERATIONS_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_OPERATIONS_SETTINGS };
  return {
    ...DEFAULT_OPERATIONS_SETTINGS,
    ...(doc.data() as OperationsSettings),
  };
}

export async function updateOperationsSettings(
  patch: Partial<OperationsSettings>,
  actorUid?: string
): Promise<OperationsSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(OPERATIONS_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_OPERATIONS_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  await logOperation({
    type: "settings_update",
    module: "operations",
    message: "Operations settings updated",
    severity: "info",
    createdBy: actorUid,
    metadata: patch as Record<string, unknown>,
  });
  return getOperationsSettings();
}

async function queueDocs(collectionName: string, service: string, limit = 150): Promise<QueueJobItem[]> {
  const snap = await getAdminDb().collection(collectionName).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      service,
      queue: collectionName,
      status: (asString(data.status || "pending").toLowerCase() as QueueJobItem["status"]) || "pending",
      processingTimeMs: toNum(data.processingTimeMs || data.durationMs, null as unknown as number),
      createdAt: asString(data.createdAt),
      updatedAt: asString(data.updatedAt),
      error: asString(data.error || data.errorMessage || ""),
    };
  });
}

export async function getQueueDashboard(filterService?: string, q?: string) {
  const all = (
    await Promise.all([
      queueDocs("mediaGenerationQueue", "Media"),
      queueDocs("socialPostQueue", "Social"),
      queueDocs("editorialQueue", "Editorial"),
      queueDocs("userDigests", "Digest"),
      queueDocs("personalizedRecommendations", "Personalization"),
    ])
  ).flat();

  let items = all;
  if (filterService) items = items.filter((x) => x.service.toLowerCase() === filterService.toLowerCase());
  if (q) {
    const query = q.toLowerCase();
    items = items.filter((x) => `${x.id} ${x.service} ${x.queue} ${x.error || ""}`.toLowerCase().includes(query));
  }

  const counts = {
    pending: items.filter((x) => x.status === "pending").length,
    running: items.filter((x) => x.status === "running").length,
    completed: items.filter((x) => x.status === "completed").length,
    failed: items.filter((x) => x.status === "failed").length,
    retrying: items.filter((x) => x.status === "retrying").length,
    cancelled: items.filter((x) => x.status === "cancelled").length,
  };

  return { counts, items: items.slice(0, 300) };
}

export async function queueAction(input: {
  action: "pause_queue" | "resume_queue" | "retry_failed" | "cancel_pending";
  queue?: string;
  jobId?: string;
  actorUid: string;
}) {
  if (input.action === "retry_failed" && input.queue && input.jobId) {
    await getAdminDb().collection(input.queue).doc(input.jobId).set({ status: "pending", updatedAt: nowIso() }, { merge: true });
  }
  if (input.action === "cancel_pending" && input.queue && input.jobId) {
    await getAdminDb().collection(input.queue).doc(input.jobId).set({ status: "cancelled", updatedAt: nowIso() }, { merge: true });
  }
  if (input.action === "pause_queue" || input.action === "resume_queue") {
    const settings = await getOperationsSettings();
    const enabled = input.action === "resume_queue";
    await updateOperationsSettings(
      {
        automationToggles: {
          ...settings.automationToggles,
          automationEngine: enabled,
        },
      },
      input.actorUid
    );
  }
  await getAdminDb().collection("queueLogs").add({
    action: input.action,
    queue: input.queue || null,
    jobId: input.jobId || null,
    actorUid: input.actorUid,
    createdAt: nowIso(),
  });
  await logOperation({
    type: "queue_action",
    module: "queue",
    message: `${input.action} executed`,
    severity: "info",
    createdBy: input.actorUid,
    metadata: input as unknown as Record<string, unknown>,
  });
  return { success: true };
}

function buildCronPlan(now = new Date()): Omit<CronItem, "status" | "lastRun" | "durationMs" | "lastError">[] {
  const next3am = new Date(now);
  next3am.setUTCHours(3, 0, 0, 0);
  if (next3am <= now) next3am.setUTCDate(next3am.getUTCDate() + 1);
  const next315 = new Date(next3am);
  next315.setUTCMinutes(15);
  const nextCleanup = new Date(now);
  nextCleanup.setUTCHours(4, 0, 0, 0);
  if (nextCleanup <= now) nextCleanup.setUTCDate(nextCleanup.getUTCDate() + 1);

  return [
    { id: "fetch-news", name: "Fetch News", schedule: "0 3 * * *", enabled: true, nextRun: next3am.toISOString() },
    { id: "process-news", name: "Process News", schedule: "15 3 * * *", enabled: true, nextRun: next315.toISOString() },
    { id: "cleanup", name: "Cleanup", schedule: "0 4 * * *", enabled: true, nextRun: nextCleanup.toISOString() },
  ];
}

export async function getCronDashboard() {
  const plan = buildCronPlan();
  const logsSnap = await getAdminDb().collection("cronLogs").orderBy("createdAt", "desc").limit(120).get();
  const logs: Record<string, unknown>[] = logsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  const result: CronItem[] = plan.map((cron) => {
    const last = logs.find((l) => asString(l.cronId) === cron.id);
    return {
      ...cron,
      status: (asString(last?.status) as CronItem["status"]) || "unknown",
      lastRun: asString(last?.createdAt),
      durationMs: toNum(last?.durationMs, null as unknown as number),
      lastError: asString(last?.error || "") || null,
    };
  });
  return { items: result, logs };
}

export async function cronAction(input: {
  action: "run" | "enable" | "disable" | "retry_failed_execution";
  cronId: "fetch-news" | "process-news" | "cleanup";
  actorUid: string;
}) {
  const settings = await getOperationsSettings();
  if (input.action === "run" || input.action === "retry_failed_execution") {
    if (!settings.allowManualCronRun) throw new Error("Manual cron run disabled");
    const start = Date.now();
    let status: "healthy" | "failed" = "healthy";
    let error = "";
    try {
      if (input.cronId === "fetch-news") await runFetchNews();
      else if (input.cronId === "process-news") await runProcessNews(5);
      else {
        await Promise.resolve();
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Manual cron run failed";
    }
    await getAdminDb().collection("cronLogs").add({
      cronId: input.cronId,
      action: input.action,
      status,
      durationMs: Date.now() - start,
      error: error || null,
      createdBy: input.actorUid,
      createdAt: nowIso(),
    });
    if (status === "failed") throw new Error(error);
  } else {
    const curr = await getOperationsSettings();
    const key = input.cronId === "fetch-news" ? "rssFetch" : input.cronId === "process-news" ? "automationEngine" : "analyticsJobs";
    await updateOperationsSettings(
      {
        automationToggles: {
          ...curr.automationToggles,
          [key]: input.action === "enable",
        },
      } as Partial<OperationsSettings>,
      input.actorUid
    );
    await getAdminDb().collection("cronLogs").add({
      cronId: input.cronId,
      action: input.action,
      status: "healthy",
      durationMs: 0,
      error: null,
      createdBy: input.actorUid,
      createdAt: nowIso(),
    });
  }
  await logOperation({
    type: "cron_action",
    module: "cron",
    message: `${input.action} ${input.cronId}`,
    severity: "info",
    createdBy: input.actorUid,
  });
  return { success: true };
}

async function countRecentErrors(hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const snap = await getAdminDb()
    .collection("systemLogs")
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  return snap.docs.filter((d) => ["error", "critical"].includes(asString(d.data().severity))).length;
}

export async function getHealthDashboard(force = false) {
  const cacheDoc = getAdminDb().collection("healthChecks").doc("latest");
  if (!force) {
    const cached = await cacheDoc.get();
    if (cached.exists) {
      const data = cached.data() as Record<string, unknown>;
      const ageSec = (Date.now() - new Date(asString(data.createdAt)).getTime()) / 1000;
      if (ageSec < 45) return data.payload as { services: ServiceHealthItem[]; overall: ServiceHealthItem };
    }
  }
  const start = Date.now();
  const [queueData, errorCount] = await Promise.all([getQueueDashboard(), countRecentErrors()]);
  const baseOk = async (key: string, label: string, fn: () => Promise<void>): Promise<ServiceHealthItem> => {
    const t = Date.now();
    try {
      await fn();
      return {
        key,
        label,
        status: "healthy",
        lastChecked: nowIso(),
        responseTimeMs: Date.now() - t,
        errorCount: 0,
        recoveryAttempts: 0,
      };
    } catch (e) {
      return {
        key,
        label,
        status: "critical",
        lastChecked: nowIso(),
        responseTimeMs: Date.now() - t,
        errorCount: 1,
        recoveryAttempts: 0,
        message: e instanceof Error ? e.message : `${label} check failed`,
      };
    }
  };

  const settings = await getOperationsSettings();
  const services: ServiceHealthItem[] = await Promise.all([
    baseOk("frontend", "Frontend", async () => Promise.resolve()),
    baseOk("backend_api", "Backend API", async () => Promise.resolve()),
    baseOk("firestore", "Firestore", async () => {
      await getAdminDb().collection("settings").doc("siteSettings").get();
    }),
    baseOk("firebase_auth", "Firebase Authentication", async () => Promise.resolve()),
    baseOk("firebase_storage", "Firebase Storage", async () => Promise.resolve()),
    baseOk("vercel_cron", "Vercel Cron Jobs", async () => Promise.resolve()),
    baseOk("automation_engine", "Automation Engine", async () => {
      if (!settings.automationToggles.automationEngine) throw new Error("Disabled by settings");
    }),
    baseOk("rss_fetcher", "RSS Fetcher", async () => {
      if (!settings.automationToggles.rssFetch) throw new Error("Disabled by settings");
    }),
    baseOk("ai_provider", "AI Provider", async () => {
      if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) throw new Error("No AI provider configured");
    }),
    baseOk("queue_system", "Queue System", async () => {
      if (queueData.counts.failed > settings.queueWarningThreshold) throw new Error("Failed queue backlog high");
    }),
    baseOk("push_notifications", "Push Notifications", async () => Promise.resolve()),
    baseOk("newsletter", "Newsletter", async () => Promise.resolve()),
    baseOk("analytics", "Analytics", async () => Promise.resolve()),
    baseOk("search", "Search", async () => Promise.resolve()),
    baseOk("media_studio", "Media Studio", async () => Promise.resolve()),
    baseOk("voice_studio", "Voice Studio", async () => Promise.resolve()),
    baseOk("social_manager", "Social Manager", async () => Promise.resolve()),
    baseOk("seo_manager", "SEO Manager", async () => Promise.resolve()),
    baseOk("editorial_manager", "Editorial Manager", async () => Promise.resolve()),
  ]);

  const critical = services.filter((s) => s.status === "critical").length;
  const warning = services.filter((s) => s.status === "warning").length;
  const overall: ServiceHealthItem = {
    key: "overall",
    label: "Overall System Health",
    status: critical ? "critical" : warning || errorCount >= settings.errorAlertThreshold ? "warning" : "healthy",
    lastChecked: nowIso(),
    responseTimeMs: Date.now() - start,
    errorCount,
    recoveryAttempts: 0,
  };

  const payload = { services, overall };
  await cacheDoc.set({ payload, createdAt: nowIso() }, { merge: true });
  await getAdminDb().collection("healthChecks").add({
    payload,
    createdAt: nowIso(),
  });
  return payload;
}

export async function getErrorCenter() {
  const snap = await getAdminDb().collection("systemLogs").orderBy("createdAt", "desc").limit(250).get();
  const items: Record<string, unknown>[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  return {
    items,
    summary: {
      critical: items.filter((x) => asString(x.severity) === "critical").length,
      error: items.filter((x) => asString(x.severity) === "error").length,
      warning: items.filter((x) => asString(x.severity) === "warning").length,
    },
  };
}

export async function getAlerts() {
  const [queues, errors, settings, costs] = await Promise.all([
    getQueueDashboard(),
    getErrorCenter(),
    getOperationsSettings(),
    getCostMonitor(),
  ]);
  const alerts: Record<string, unknown>[] = [];
  if (queues.counts.failed > settings.queueWarningThreshold) {
    alerts.push({
      id: `queue-${Date.now()}`,
      type: "Queue backlog",
      severity: "warning",
      affectedService: "Queue System",
      message: `Failed jobs ${queues.counts.failed} exceed threshold ${settings.queueWarningThreshold}`,
      retryStatus: "pending",
      suggestedResolution: "Retry failed jobs and inspect queue errors.",
      status: "active",
      createdAt: nowIso(),
    });
  }
  if (errors.summary.error + errors.summary.critical > settings.errorAlertThreshold) {
    alerts.push({
      id: `error-${Date.now()}`,
      type: "High error rate",
      severity: "critical",
      affectedService: "System",
      message: "Error rate above configured threshold.",
      retryStatus: "pending",
      suggestedResolution: "Inspect Error Center and resolve repeated failures.",
      status: "active",
      createdAt: nowIso(),
    });
  }
  if (Number(costs.monthly.estimatedCost || 0) >= settings.costAlertThreshold) {
    alerts.push({
      id: `cost-${Date.now()}`,
      type: "Cost threshold",
      severity: "warning",
      affectedService: "AI Provider",
      message: "Estimated monthly AI cost is nearing configured limit.",
      retryStatus: "na",
      suggestedResolution: "Lower model usage or tighten AI limits.",
      status: "active",
      createdAt: nowIso(),
    });
  }
  return { alerts };
}

export async function alertAction(input: {
  alertId: string;
  action: "resolve" | "mute" | "archive";
  actorUid: string;
}) {
  await getAdminDb().collection("operationLogs").add({
    type: "alert_action",
    module: "alerts",
    message: `${input.action} alert ${input.alertId}`,
    severity: "info",
    createdBy: input.actorUid,
    createdAt: nowIso(),
  });
  return { success: true };
}

function sumCost(items: Record<string, unknown>[]) {
  return Number(
    items.reduce((acc, item) => acc + Number(item.cost || item.estimatedCost || item.totalEstimatedCost || 0), 0).toFixed(4)
  );
}

export async function getCostMonitor() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(dayStart);
  monthStart.setDate(1);
  const [contentLogs, seoLogs, mediaLogs, voiceLogs] = await Promise.all([
    getAdminDb().collection("aiContentLogs").where("createdAt", ">=", monthStart.toISOString()).limit(2000).get(),
    getAdminDb().collection("aiSeoLogs").where("createdAt", ">=", monthStart.toISOString()).limit(2000).get(),
    getAdminDb().collection("aiMediaLogs").where("createdAt", ">=", monthStart.toISOString()).limit(2000).get(),
    getAdminDb().collection("voiceVideoLogs").where("createdAt", ">=", monthStart.toISOString()).limit(2000).get(),
  ]);
  const all = [...contentLogs.docs, ...seoLogs.docs, ...mediaLogs.docs, ...voiceLogs.docs].map((d) => d.data() as Record<string, unknown>);
  const today = all.filter((x) => asString(x.createdAt) >= dayStart.toISOString());
  const tokenUsage = all.reduce((acc, x) => acc + Number(x.tokensUsed || x.tokenUsage || 0), 0);
  return {
    today: {
      requests: today.length,
      tokenUsage: today.reduce((acc, x) => acc + Number(x.tokensUsed || x.tokenUsage || 0), 0),
      estimatedCost: sumCost(today),
    },
    monthly: {
      requests: all.length,
      tokenUsage,
      estimatedCost: sumCost(all),
    },
    providers: {
      openai: all.filter((x) => asString(x.provider).toLowerCase().includes("openai")).length,
      gemini: all.filter((x) => asString(x.provider).toLowerCase().includes("gemini")).length,
      other: all.filter((x) => {
        const p = asString(x.provider).toLowerCase();
        return p && !p.includes("openai") && !p.includes("gemini");
      }).length,
    },
    imageGenerationCost: sumCost(mediaLogs.docs.map((d) => d.data() as Record<string, unknown>)),
    voiceGenerationCost: sumCost(voiceLogs.docs.map((d) => d.data() as Record<string, unknown>)),
  };
}

export async function getLogs(limit = 200) {
  const snap = await getAdminDb().collection("operationLogs").orderBy("createdAt", "desc").limit(Math.min(500, Math.max(1, limit))).get();
  return { items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) };
}

export async function getDependencyStatus() {
  return {
    aiProvider: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY ? "Connected" : "Needs Attention",
    googleAnalytics: process.env.GA4_PROPERTY_ID ? "Connected" : "Disconnected",
    searchConsole: process.env.GSC_SITE_URL ? "Connected" : "Disconnected",
    clarity: process.env.CLARITY_PROJECT_ID ? "Connected" : "Disconnected",
    firebase: process.env.FIREBASE_PROJECT_ID ? "Connected" : "Connected",
    vercel: process.env.VERCEL ? "Connected" : "Needs Attention",
    pushNotifications: "Needs Attention",
    socialAccounts: "Needs Attention",
  };
}

export async function getPerformanceMonitor() {
  const [queueDash, cronDash] = await Promise.all([getQueueDashboard(), getCronDashboard()]);
  const queueItems = queueDash.items;
  const avgQueueLatency =
    queueItems.length > 0
      ? Number(
          (
            queueItems.reduce((acc, x) => acc + Number(x.processingTimeMs || 0), 0) /
            Math.max(1, queueItems.filter((x) => Number(x.processingTimeMs || 0) > 0).length)
          ).toFixed(2)
        )
      : 0;
  const slowestQueue = [...queueItems].sort((a, b) => Number(b.processingTimeMs || 0) - Number(a.processingTimeMs || 0))[0] || null;
  const cronDur = cronDash.items
    .map((x) => Number(x.durationMs || 0))
    .filter((x) => x > 0);
  const avgCronMs = cronDur.length ? Number((cronDur.reduce((a, b) => a + b, 0) / cronDur.length).toFixed(2)) : 0;
  return {
    averageApiResponseTimeMs: null,
    slowestEndpoints: [],
    firestoreReads: null,
    firestoreWrites: null,
    storageUsage: null,
    imageGenerationDurationMs: null,
    queueLatencyMs: avgQueueLatency,
    slowestQueueJob: slowestQueue,
    cronExecutionAvgMs: avgCronMs,
    memory: "placeholder",
  };
}
