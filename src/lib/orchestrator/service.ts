import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_ORCHESTRATOR_SETTINGS, defaultWorkflowTemplate, ORCHESTRATOR_SETTINGS_DOC_ID } from "./defaults";
import { AiModuleRecord, JobPriority, JobStatus, OrchestratorSettings, WorkflowDefinition, WorkflowExecution } from "./types";

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

function normalizeStatus(v: unknown): JobStatus {
  const value = asString(v).toLowerCase();
  if (["queued", "running", "completed", "failed", "retrying", "cancelled"].includes(value)) {
    return value as JobStatus;
  }
  return "queued";
}

async function audit(actionType: string, message: string, actorUid?: string, metadata?: Record<string, unknown>) {
  await getAdminDb().collection("workflowAuditLogs").add({
    actionType,
    module: "orchestrator",
    message,
    actorUid: actorUid || null,
    metadata: metadata || {},
    createdAt: nowIso(),
  });
}

const REGISTERED_MODULES: Array<Pick<AiModuleRecord, "name" | "version" | "dependencies">> = [
  { name: "Automation Engine", version: "1.0.0", dependencies: ["RSS Fetcher"] },
  { name: "RSS Fetcher", version: "1.0.0", dependencies: [] },
  { name: "AI Content Studio", version: "1.0.0", dependencies: ["Automation Engine"] },
  { name: "AI SEO Manager", version: "1.0.0", dependencies: ["AI Content Studio"] },
  { name: "AI Media Studio", version: "1.0.0", dependencies: ["AI Content Studio"] },
  { name: "AI Social Manager", version: "1.0.0", dependencies: ["AI SEO Manager", "AI Media Studio"] },
  { name: "AI Voice & Video Studio", version: "1.0.0", dependencies: ["AI Content Studio", "AI Media Studio"] },
  { name: "AI Editorial Manager", version: "1.0.0", dependencies: ["AI Content Studio"] },
  { name: "AI Analytics Manager", version: "1.0.0", dependencies: [] },
  { name: "AI Personalization Engine", version: "1.0.0", dependencies: ["AI Analytics Manager"] },
  { name: "AI Operations Center", version: "1.0.0", dependencies: ["Automation Engine"] },
];

async function safeQueryDocs(
  collectionName: string,
  opts?: { orderByField?: string; limit?: number }
) {
  const db = getAdminDb();
  const limit = opts?.limit || 120;
  const orderByField = opts?.orderByField;
  try {
    if (orderByField) {
      return (await db.collection(collectionName).orderBy(orderByField, "desc").limit(limit).get()).docs;
    }
    return (await db.collection(collectionName).limit(limit).get()).docs;
  } catch {
    try {
      return (await db.collection(collectionName).limit(limit).get()).docs;
    } catch {
      return [];
    }
  }
}

function startedAtValue(data: Record<string, unknown>): number {
  const raw = data.startedAt || data.createdAt || data.updatedAt || "";
  const t = new Date(String(raw)).getTime();
  return Number.isFinite(t) ? t : 0;
}

async function loadWorkflowHistoryDocs(limit = 120) {
  // Support both current and legacy collection names (Firebase index error referenced workflow_history).
  const [primary, legacy] = await Promise.all([
    safeQueryDocs("workflowExecutions", { orderByField: "startedAt", limit }),
    safeQueryDocs("workflow_history", { orderByField: "startedAt", limit }),
  ]);

  const merged = new Map<string, { id: string; data: Record<string, unknown> }>();
  for (const d of [...primary, ...legacy]) {
    const data = d.data() as Record<string, unknown>;
    // Normalize legacy field names
    if (!data.workflowId && data.workflowDefinition) data.workflowId = data.workflowDefinition;
    if (!data.workflowName && data.name) data.workflowName = data.name;
    merged.set(d.id, { id: d.id, data });
  }

  return [...merged.values()]
    .sort((a, b) => startedAtValue(b.data) - startedAtValue(a.data))
    .slice(0, limit);
}

export async function ensureModuleRegistry() {
  const collection = getAdminDb().collection("aiModules");
  const snap = await collection.limit(100).get();
  const existing = new Set(snap.docs.map((d) => asString(d.data().name)));
  const ts = nowIso();
  const writes: Promise<unknown>[] = [];
  REGISTERED_MODULES.forEach((mod) => {
    if (!existing.has(mod.name)) {
      writes.push(
        collection.add({
          name: mod.name,
          version: mod.version,
          status: "enabled",
          enabled: true,
          dependencies: mod.dependencies,
          lastHeartbeat: ts,
          health: "unknown",
          lastExecution: "",
          queueStatus: "unknown",
          errorCount: 0,
        })
      );
    }
  });
  if (writes.length) await Promise.all(writes);
}

export async function getModules() {
  await ensureModuleRegistry();
  let snap;
  try {
    snap = await getAdminDb().collection("aiModules").orderBy("name", "asc").get();
  } catch {
    snap = await getAdminDb().collection("aiModules").limit(100).get();
  }

  const historyDocs = await loadWorkflowHistoryDocs(80);
  const auditDocs = await safeQueryDocs("workflowAuditLogs", { orderByField: "createdAt", limit: 200 });

  const items: AiModuleRecord[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const name = asString(data.name);
    const needle = name.toLowerCase();
    const err = auditDocs.filter((a) => {
      const row = a.data() as Record<string, unknown>;
      const msg = asString(row.message).toLowerCase();
      const action = asString(row.actionType).toLowerCase();
      return (msg.includes(needle) || asString(row.module).toLowerCase().includes(needle)) && action.includes("error");
    }).length;
    const hit = historyDocs.find(({ data: h }) => {
      const steps = (h.steps || []) as Array<Record<string, unknown>>;
      return steps.some(
        (s) =>
          asString(s.module).toLowerCase() === needle || asString(s.name).toLowerCase().includes(needle)
      );
    });
    return {
      id: d.id,
      name,
      version: asString(data.version || "1.0.0"),
      status: Boolean(data.enabled) ? "enabled" : "disabled",
      enabled: Boolean(data.enabled),
      dependencies: Array.isArray(data.dependencies) ? data.dependencies.map((x) => String(x)) : [],
      lastHeartbeat: asString(data.lastHeartbeat || nowIso()),
      health: (asString(data.health || "unknown").toLowerCase() as AiModuleRecord["health"]) || "unknown",
      lastExecution: hit ? asString(hit.data.startedAt) : asString(data.lastExecution || ""),
      queueStatus: asString(data.queueStatus || "unknown"),
      errorCount: err || toNum(data.errorCount),
    };
  });
  return { items };
}

export async function toggleModule(moduleId: string, enabled: boolean, actorUid: string) {
  await getAdminDb().collection("aiModules").doc(moduleId).set(
    {
      enabled,
      status: enabled ? "enabled" : "disabled",
      lastHeartbeat: nowIso(),
    },
    { merge: true }
  );
  await audit("module_toggle", `Module ${moduleId} ${enabled ? "enabled" : "disabled"}`, actorUid, { moduleId, enabled });
  return { success: true };
}

export async function getOrchestratorSettings(): Promise<OrchestratorSettings> {
  const doc = await getAdminDb().collection("settings").doc(ORCHESTRATOR_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_ORCHESTRATOR_SETTINGS };
  return {
    ...DEFAULT_ORCHESTRATOR_SETTINGS,
    ...(doc.data() as OrchestratorSettings),
  };
}

export async function updateOrchestratorSettings(patch: Partial<OrchestratorSettings>, actorUid: string) {
  await getAdminDb()
    .collection("settings")
    .doc(ORCHESTRATOR_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_ORCHESTRATOR_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  await audit("settings_update", "Orchestrator settings updated", actorUid, patch as Record<string, unknown>);
  return getOrchestratorSettings();
}

function validateWorkflow(def: Partial<WorkflowDefinition>) {
  if (!def.name || !String(def.name).trim()) throw new Error("Workflow name required");
  if (!Array.isArray(def.steps) || !def.steps.length) throw new Error("At least one workflow step is required");
  const enabledSteps = def.steps.filter((s) => s.enabled !== false);
  if (!enabledSteps.length) throw new Error("At least one enabled step required");
  const stepIds = new Set<string>();
  for (const step of def.steps) {
    if (!step.id || !step.name || !step.module) throw new Error("Each step requires id, name, and module");
    if (stepIds.has(step.id)) throw new Error(`Duplicate step id: ${step.id}`);
    stepIds.add(step.id);
    if (step.timeoutSec <= 0 || step.timeoutSec > 3600) throw new Error(`Invalid timeout for step ${step.id}`);
    if (step.retryLimit < 0 || step.retryLimit > 10) throw new Error(`Invalid retryLimit for step ${step.id}`);
  }
}

export async function ensureWorkflowDefaults(actorUid?: string) {
  const defs = await getAdminDb().collection("workflowDefinitions").limit(1).get();
  if (!defs.empty) return;
  const template = defaultWorkflowTemplate(nowIso(), actorUid);
  await getAdminDb().collection("workflowDefinitions").add(template);
  await getAdminDb().collection("workflowTemplates").add(template);
}

export async function getWorkflows() {
  await ensureWorkflowDefaults();
  const [definitions, templates] = await Promise.all([
    safeQueryDocs("workflowDefinitions", { orderByField: "updatedAt", limit: 120 }),
    safeQueryDocs("workflowTemplates", { orderByField: "updatedAt", limit: 120 }),
  ]);
  return {
    definitions: definitions.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    templates: templates.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
  };
}

export async function saveWorkflow(
  action: "create" | "update" | "delete",
  payload: Partial<WorkflowDefinition> & { id?: string },
  actorUid: string
) {
  if (action === "delete") {
    if (!payload.id) throw new Error("Workflow id required");
    await getAdminDb().collection("workflowDefinitions").doc(payload.id).delete();
    await audit("workflow_delete", `Workflow ${payload.id} deleted`, actorUid, { workflowId: payload.id });
    return { success: true };
  }
  validateWorkflow(payload);
  const docPayload: WorkflowDefinition = {
    name: String(payload.name),
    description: String(payload.description || ""),
    enabled: payload.enabled !== false,
    trigger: (payload.trigger || "manual") as WorkflowDefinition["trigger"],
    steps: payload.steps || [],
    createdAt: String(payload.createdAt || nowIso()),
    updatedAt: nowIso(),
    createdBy: payload.createdBy || actorUid,
  };
  if (action === "create") {
    const ref = await getAdminDb().collection("workflowDefinitions").add(docPayload);
    await audit("workflow_create", `Workflow created: ${docPayload.name}`, actorUid, { workflowId: ref.id });
    return { id: ref.id, ...docPayload };
  }
  if (!payload.id) throw new Error("Workflow id required");
  await getAdminDb().collection("workflowDefinitions").doc(payload.id).set(docPayload, { merge: true });
  await audit("workflow_update", `Workflow updated: ${payload.id}`, actorUid, { workflowId: payload.id });
  return { id: payload.id, ...docPayload };
}

export async function emitEvent(eventType: string, payload: Record<string, unknown>, actorUid?: string) {
  const data = {
    eventType,
    payload,
    status: "received",
    createdAt: nowIso(),
    actorUid: actorUid || null,
  };
  await getAdminDb().collection("eventLogs").add(data);
  return data;
}

async function createJob(params: {
  workflowExecutionId: string;
  workflowId: string;
  workflowName: string;
  stepId: string;
  stepName: string;
  module: string;
  priority: JobPriority;
  dependsOn: string[];
  retryLimit: number;
  timeoutSec: number;
  actorUid?: string;
}) {
  const payload = {
    workflowExecutionId: params.workflowExecutionId,
    workflowId: params.workflowId,
    workflowName: params.workflowName,
    stepId: params.stepId,
    stepName: params.stepName,
    module: params.module,
    priority: params.priority,
    dependsOn: params.dependsOn,
    status: "queued",
    retryCount: 0,
    retryLimit: params.retryLimit,
    timeoutSec: params.timeoutSec,
    startedAt: null,
    completedAt: null,
    error: null,
    actorUid: params.actorUid || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("jobExecutions").add(payload);
  return { id: ref.id, ...payload };
}

export async function runWorkflow(
  workflowId: string,
  input: {
    trigger: string;
    initiatedBy?: string;
    priority?: JobPriority;
    payload?: Record<string, unknown>;
  }
) {
  const settings = await getOrchestratorSettings();
  if (!settings.enabled) throw new Error("Orchestrator is disabled");

  const workflowDoc = await getAdminDb().collection("workflowDefinitions").doc(workflowId).get();
  if (!workflowDoc.exists) throw new Error("Workflow not found");
  const workflow = workflowDoc.data() as WorkflowDefinition;
  if (!workflow.enabled) throw new Error("Workflow is disabled");

  const shouldPausePublishing = settings.safeMode;
  const executionPayload: WorkflowExecution = {
    workflowId,
    workflowName: workflow.name,
    trigger: input.trigger,
    status: "running",
    startedAt: nowIso(),
    completedAt: null,
    duration: null,
    steps: workflow.steps.map((s) => ({
      stepId: s.id,
      name: s.name,
      status: s.enabled ? "queued" : "cancelled",
    })),
    errors: [],
    initiatedBy: input.initiatedBy,
  };
  const executionRef = await getAdminDb().collection("workflowExecutions").add(executionPayload);

  const enabledSteps = workflow.steps.filter((s) => s.enabled);
  const jobs: Array<{ id: string }> = [];
  let prevJobId = "";
  for (const step of enabledSteps) {
    const low = step.name.toLowerCase();
    if (
      shouldPausePublishing &&
      (low.includes("publish") || low.includes("social") || low.includes("media generation"))
    ) {
      continue;
    }
    const job = await createJob({
      workflowExecutionId: executionRef.id,
      workflowId,
      workflowName: workflow.name,
      stepId: step.id,
      stepName: step.name,
      module: step.module,
      priority: input.priority || "medium",
      dependsOn: prevJobId ? [prevJobId] : [],
      retryLimit: Math.min(step.retryLimit, settings.globalRetryLimit),
      timeoutSec: Math.min(step.timeoutSec, settings.workflowTimeout),
      actorUid: input.initiatedBy,
    });
    jobs.push({ id: job.id });
    prevJobId = step.parallelGroup ? prevJobId : job.id;
  }

  await emitEvent(
    "WorkflowStarted",
    {
      workflowExecutionId: executionRef.id,
      workflowId,
      workflowName: workflow.name,
      trigger: input.trigger,
      jobCount: jobs.length,
      safeMode: settings.safeMode,
      input: input.payload || {},
    },
    input.initiatedBy
  );
  await audit("workflow_run_manual", `Workflow executed: ${workflow.name}`, input.initiatedBy, {
    workflowId,
    workflowExecutionId: executionRef.id,
    jobs: jobs.length,
    safeMode: settings.safeMode,
  });
  return { executionId: executionRef.id, workflowName: workflow.name, queuedJobs: jobs.length };
}

export async function getJobs(params?: {
  status?: JobStatus;
  priority?: JobPriority;
  workflowExecutionId?: string;
  q?: string;
}) {
  const docs = await safeQueryDocs("jobExecutions", { orderByField: "createdAt", limit: 250 });
  let items: Record<string, unknown>[] = docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  if (params?.status) items = items.filter((x) => normalizeStatus(x.status) === params.status);
  if (params?.priority) items = items.filter((x) => asString(x.priority) === params.priority);
  if (params?.workflowExecutionId) {
    items = items.filter((x) => asString(x.workflowExecutionId) === params.workflowExecutionId);
  }
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter((x) =>
      `${asString(x.stepName)} ${asString(x.module)} ${asString(x.workflowName)} ${asString(x.id)}`
        .toLowerCase()
        .includes(q)
    );
  }
  const counters = {
    queued: items.filter((x) => normalizeStatus(x.status) === "queued").length,
    running: items.filter((x) => normalizeStatus(x.status) === "running").length,
    completed: items.filter((x) => normalizeStatus(x.status) === "completed").length,
    failed: items.filter((x) => normalizeStatus(x.status) === "failed").length,
    retrying: items.filter((x) => normalizeStatus(x.status) === "retrying").length,
    cancelled: items.filter((x) => normalizeStatus(x.status) === "cancelled").length,
  };
  return { counters, items };
}

export async function updateJob(
  action: "retry" | "cancel" | "resume",
  jobId: string,
  actorUid: string
) {
  const ref = getAdminDb().collection("jobExecutions").doc(jobId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Job not found");
  const data = doc.data() as Record<string, unknown>;
  if (action === "retry") {
    await ref.set(
      {
        status: "queued",
        retryCount: toNum(data.retryCount) + 1,
        updatedAt: nowIso(),
        error: null,
      },
      { merge: true }
    );
  } else if (action === "cancel") {
    await ref.set({ status: "cancelled", updatedAt: nowIso() }, { merge: true });
  } else {
    await ref.set({ status: "queued", updatedAt: nowIso() }, { merge: true });
  }
  await audit("job_action", `Job ${jobId} ${action}`, actorUid, { action, jobId });
  return { success: true };
}

export async function getHistory(params?: { status?: string; workflowId?: string; q?: string; limit?: number }) {
  const limit = Math.min(300, Math.max(1, params?.limit || 120));
  let items: Record<string, unknown>[] = (await loadWorkflowHistoryDocs(limit)).map(({ id, data }) => ({
    id,
    ...data,
  }));

  if (params?.status) {
    items = items.filter((x) => asString(x.status) === params.status);
  }
  if (params?.workflowId) {
    items = items.filter(
      (x) =>
        asString(x.workflowId) === params.workflowId ||
        asString(x.workflowDefinition) === params.workflowId
    );
  }
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter((x) =>
      `${asString(x.workflowName)} ${asString(x.trigger)} ${asString(x.id)}`.toLowerCase().includes(q)
    );
  }
  return { items };
}

export async function getOrchestratorHealth() {
  const [settings, modules, jobs, history, eventDocs] = await Promise.all([
    getOrchestratorSettings().catch(() => ({ ...DEFAULT_ORCHESTRATOR_SETTINGS })),
    getModules().catch(() => ({ items: [] as AiModuleRecord[] })),
    getJobs().catch(() => ({
      counters: { queued: 0, running: 0, completed: 0, failed: 0, retrying: 0, cancelled: 0 },
      items: [] as Record<string, unknown>[],
    })),
    getHistory({ limit: 200 }).catch(() => ({ items: [] as Record<string, unknown>[] })),
    safeQueryDocs("eventLogs", { orderByField: "createdAt", limit: 300 }),
  ]);
  const execItems = history.items;
  const completed = execItems.filter((x) => asString(x.status) === "completed").length;
  const failed = execItems.filter((x) => asString(x.status) === "failed").length;
  const successRate = completed + failed ? Number(((completed / (completed + failed)) * 100).toFixed(2)) : 100;
  const avgDuration =
    execItems
      .map((x) => toNum(x.duration))
      .filter((x) => x > 0)
      .reduce((acc, x, _, arr) => acc + x / arr.length, 0) || 0;
  const failureMap = new Map<string, number>();
  execItems.forEach((x) => {
    const errors = Array.isArray(x.errors) ? x.errors : [];
    errors.forEach((e) => failureMap.set(String(e), (failureMap.get(String(e)) || 0) + 1));
  });
  const moduleDown = modules.items.filter((m) => m.health === "critical" || m.health === "offline").length;
  return {
    overview: {
      enabled: settings.enabled,
      safeMode: settings.safeMode,
      maintenanceMode: settings.maintenanceMode,
      pendingWorkflows: execItems.filter((x) => asString(x.status) === "pending").length,
      activeWorkflows: execItems.filter((x) => asString(x.status) === "running").length,
      successRate,
      failureRate: Number((100 - successRate).toFixed(2)),
      averageProcessingTime: Number(avgDuration.toFixed(2)),
      jobCounters: jobs.counters,
      moduleDown,
      eventsInWindow: eventDocs.length,
    },
    mostCommonFailures: [...failureMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count })),
    timeline: execItems.slice(0, 80),
  };
}

export async function emergencyAction(
  action:
    | "pause_all"
    | "resume_all"
    | "pause_module"
    | "resume_module"
    | "cancel_queued_workflows"
    | "restart_safe_queues",
  actorUid: string,
  payload?: { moduleId?: string }
) {
  if (action === "pause_all" || action === "resume_all") {
    await updateOrchestratorSettings({ enabled: action === "resume_all" }, actorUid);
  } else if (action === "pause_module" || action === "resume_module") {
    if (!payload?.moduleId) throw new Error("moduleId required");
    await toggleModule(payload.moduleId, action === "resume_module", actorUid);
  } else if (action === "cancel_queued_workflows") {
    const jobs = await getJobs({ status: "queued" });
    await Promise.all(
      jobs.items.slice(0, 1000).map((job) =>
        getAdminDb().collection("jobExecutions").doc(String(job.id)).set(
          {
            status: "cancelled",
            updatedAt: nowIso(),
          },
          { merge: true }
        )
      )
    );
  } else if (action === "restart_safe_queues") {
    const jobs = await getJobs({ status: "failed" });
    await Promise.all(
      jobs.items.slice(0, 300).map((job) =>
        getAdminDb().collection("jobExecutions").doc(String(job.id)).set(
          {
            status: "queued",
            updatedAt: nowIso(),
            error: null,
          },
          { merge: true }
        )
      )
    );
  }
  await audit("emergency_action", `Emergency action: ${action}`, actorUid, payload as Record<string, unknown>);
  await emitEvent("EmergencyAction", { action, payload: payload || {} }, actorUid);
  return { success: true };
}
