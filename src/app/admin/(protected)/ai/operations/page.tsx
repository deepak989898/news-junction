"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  DatabaseZap,
  Play,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import OpsStatusPill, { OpsMetricCard, OpsStatusCard } from "@/components/admin/OpsStatusPill";
import { useAuth } from "@/contexts/AuthContext";
import {
  alertActionApi,
  cronActionApi,
  getOpsAlertsApi,
  getOpsCostApi,
  getOpsCronApi,
  getOpsErrorsApi,
  getOpsHealthApi,
  getOpsLogsApi,
  getOpsQueuesApi,
  getOpsSettingsApi,
  queueActionApi,
  updateMaintenanceModeApi,
} from "@/lib/operations/client-api";
import {
  countTone,
  cronStatusTone,
  dependencyTone,
  opsTone,
  queueStatusTone,
  severityTone,
  TONE_CLASSES,
} from "@/lib/operations/status-styles";

async function runAction(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    toast.success(`${label} completed`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : `${label} failed`);
    throw e;
  }
}

function ToneIcon({ tone }: { tone: ReturnType<typeof opsTone> }) {
  if (tone === "good") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (tone === "bad") return <XCircle className="h-4 w-4 text-red-600" />;
  if (tone === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return null;
}

export default function OperationsCenterPage() {
  const { adminUser } = useAuth();
  const isSuperAdmin = adminUser?.role === "super_admin";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [queues, setQueues] = useState<Record<string, unknown> | null>(null);
  const [cron, setCron] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Record<string, unknown> | null>(null);
  const [cost, setCost] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown> | null>(null);
  const [qSearch, setQSearch] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});

  const load = async (force = false) => {
    const [h, q, c, e, a, co, l, s] = await Promise.all([
      getOpsHealthApi(force),
      getOpsQueuesApi(undefined, qSearch || undefined),
      getOpsCronApi(),
      getOpsErrorsApi(),
      getOpsAlertsApi(),
      getOpsCostApi(),
      getOpsLogsApi(),
      getOpsSettingsApi(),
    ]);
    setHealth(h as Record<string, unknown>);
    setQueues(q as Record<string, unknown>);
    setCron(c as Record<string, unknown>);
    setErrors(e as Record<string, unknown>);
    setAlerts(a as Record<string, unknown>);
    setCost(co as Record<string, unknown>);
    setLogs(l as Record<string, unknown>);
    setSettingsDraft((s as Record<string, unknown>) || {});
    setMaintenanceEnabled(Boolean((s as Record<string, unknown>).maintenanceMode));
    setMaintenanceMessage(String((s as Record<string, unknown>).maintenanceMessage || ""));
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load operations center");
      setLoading(false);
    });
  }, []);

  const healthItems = useMemo(() => ((health?.services as Record<string, unknown>[]) || []).slice(0, 24), [health]);
  const queueItems = useMemo(() => ((queues?.items as Record<string, unknown>[]) || []).slice(0, 120), [queues]);
  const cronItems = useMemo(() => ((cron?.items as Record<string, unknown>[]) || []).slice(0, 20), [cron]);
  const errorItems = useMemo(() => ((errors?.items as Record<string, unknown>[]) || []).slice(0, 80), [errors]);
  const alertItems = useMemo(() => ((alerts?.alerts as Record<string, unknown>[]) || []).slice(0, 40), [alerts]);
  const logItems = useMemo(() => ((logs?.items as Record<string, unknown>[]) || []).slice(0, 80), [logs]);
  const deps = (health?.dependencies || {}) as Record<string, unknown>;

  const overallStatus = String((health?.overall as Record<string, unknown>)?.status || "unknown");
  const failedQueueCount = Number((queues?.counts as Record<string, unknown>)?.failed || 0);
  const errorSummary = (errors?.summary as Record<string, unknown>) || {};
  const criticalErrors = Number(errorSummary.critical || 0);
  const totalErrors = Number(errorSummary.error || 0) + criticalErrors;

  const actionItems = useMemo(() => {
    let count = failedQueueCount;
    count += alertItems.length;
    count += errorItems.filter((e) => ["error", "critical"].includes(String(e.severity))).length;
    count += Object.values(deps).filter((v) => dependencyTone(v) !== "good").length;
    count += cronItems.filter((c) => cronStatusTone(c.status, c.lastRun || "Never") !== "good").length;
    return count;
  }, [failedQueueCount, alertItems, errorItems, deps, cronItems]);

  const saveSettings = async () => {
    if (!isSuperAdmin) {
      toast.error("Super admin required to save settings");
      return;
    }
    if (!window.confirm("Save operations settings?")) return;
    await runAction("Settings save", () =>
      updateMaintenanceModeApi({
        maintenanceMode: maintenanceEnabled,
        maintenanceMessage,
        adminWhitelist: [],
        ...settingsDraft,
        confirm: true,
      })
    );
    await load(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load(true);
      toast.success("Dashboard refreshed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Operations Control Center"
        actions={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`mr-1 inline h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {actionItems > 0 ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            {actionItems} item{actionItems === 1 ? "" : "s"} need your attention
          </p>
          <p className="mt-1 text-xs text-red-800">
            Red = action required · Amber = review soon · Green = working normally
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p className="font-semibold">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            All systems look healthy — no urgent actions
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OpsMetricCard
          label="Overall system health"
          value={overallStatus}
          tone={opsTone(overallStatus)}
          hint={overallStatus === "healthy" ? "All core services OK" : "Check health cards below"}
        />
        <OpsMetricCard
          label="Queue failed jobs"
          value={failedQueueCount}
          tone={countTone(failedQueueCount, 1, 3)}
          hint={failedQueueCount > 0 ? "Retry failed jobs in Queue Manager" : "No failed queue jobs"}
        />
        <OpsMetricCard
          label="Today's AI requests"
          value={String((cost?.today as Record<string, unknown>)?.requests || 0)}
          tone="good"
        />
        <OpsMetricCard
          label="Monthly estimated cost"
          value={`$${String((cost?.monthly as Record<string, unknown>)?.estimatedCost || 0)}`}
          tone={Number((cost?.monthly as Record<string, unknown>)?.estimatedCost || 0) >= Number(settingsDraft.costAlertThreshold || 80) ? "warn" : "good"}
        />
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">
          <Activity className="mr-1 inline h-4 w-4" />
          System Health Dashboard
        </h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {healthItems.map((h) => {
            const tone = opsTone(h.status);
            const c = TONE_CLASSES[tone];
            return (
              <div key={String(h.key)} className={`rounded-lg border p-3 ${c.bg} ${c.border}`}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className={`font-semibold ${c.text}`}>{String(h.label)}</p>
                  <OpsStatusPill label={String(h.status)} tone={tone} />
                </div>
                <p className="text-xs text-gray-600">Last checked: {String(h.lastChecked || "NA")}</p>
                <p className="text-xs text-gray-600">Response: {String(h.responseTimeMs ?? "NA")} ms</p>
                <p className={`text-xs ${Number(h.errorCount || 0) > 0 ? "font-medium text-red-700" : "text-gray-600"}`}>
                  Error count: {String(h.errorCount || 0)}
                </p>
                {h.message ? <p className="mt-1 text-xs text-red-700">{String(h.message)}</p> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">
            <DatabaseZap className="mr-1 inline h-4 w-4" />
            Queue Manager
          </h3>
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {(["pending", "running", "completed", "failed", "retrying"] as const).map((k) => {
              const n = Number((queues?.counts as Record<string, unknown>)?.[k] || 0);
              const tone = k === "failed" ? countTone(n, 1, 1) : k === "completed" ? "good" : n > 0 ? "warn" : "neutral";
              return (
                <span key={k} className={`rounded-full px-2 py-0.5 font-medium ${TONE_CLASSES[tone].badge}`}>
                  {k}: {n}
                </span>
              );
            })}
          </div>
          <div className="mb-2 flex gap-2">
            <input
              value={qSearch}
              onChange={(e) => setQSearch(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="Search queue id/service/error"
            />
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() =>
                getOpsQueuesApi(undefined, qSearch)
                  .then((d) => setQueues(d as Record<string, unknown>))
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Search failed"))
              }
            >
              Find
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900"
              onClick={() => runAction("Pause queue", () => queueActionApi({ action: "pause_queue" }).then(() => load(true)))}
            >
              Pause queue
            </button>
            <button
              className="rounded border border-green-300 bg-green-50 px-2 py-1 text-green-900"
              onClick={() => runAction("Resume queue", () => queueActionApi({ action: "resume_queue" }).then(() => load(true)))}
            >
              Resume queue
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {queueItems.map((q) => {
              const tone = queueStatusTone(q.status);
              const c = TONE_CLASSES[tone];
              const needsAction = tone === "bad";
              return (
                <div key={String(q.id)} className={`rounded-lg border p-2 ${c.bg} ${c.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${c.text}`}>
                      {String(q.service)} · {String(q.status)}
                    </p>
                    <ToneIcon tone={tone} />
                  </div>
                  <p className="text-xs text-gray-600">
                    {String(q.queue)} · {String(q.id)}
                  </p>
                  {q.error ? <p className="mt-1 text-xs text-red-700">{String(q.error)}</p> : null}
                  <div className="mt-1 flex gap-2 text-xs">
                    {needsAction ? (
                      <button
                        className="rounded border border-red-400 bg-red-100 px-2 py-0.5 font-medium text-red-900"
                        onClick={() =>
                          runAction("Retry job", () =>
                            queueActionApi({ action: "retry_failed", queue: q.queue, jobId: q.id }).then(() => load(true))
                          )
                        }
                      >
                        Retry
                      </button>
                    ) : (
                      <button
                        className="rounded border px-2 py-0.5"
                        onClick={() =>
                          runAction("Retry job", () =>
                            queueActionApi({ action: "retry_failed", queue: q.queue, jobId: q.id }).then(() => load(true))
                          )
                        }
                      >
                        Retry
                      </button>
                    )}
                    <button
                      className="rounded border px-2 py-0.5"
                      onClick={() =>
                        runAction("Cancel job", () =>
                          queueActionApi({ action: "cancel_pending", queue: q.queue, jobId: q.id }).then(() => load(true))
                        )
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
            {!queueItems.length && (
              <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">No queue jobs found.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">
            <Clock3 className="mr-1 inline h-4 w-4" />
            Cron Manager
          </h3>
          {!isSuperAdmin && (
            <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              Run / Enable / Disable requires super admin role.
            </p>
          )}
          <div className="space-y-2 text-sm">
            {cronItems.map((c) => {
              const lastRun = c.lastRun ? String(c.lastRun) : "Never";
              const tone = cronStatusTone(c.status, lastRun);
              const cardTone = TONE_CLASSES[tone];
              return (
                <div key={String(c.id)} className={`rounded-lg border p-2 ${cardTone.bg} ${cardTone.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${cardTone.text}`}>
                      {String(c.name)} · {String(c.status)}
                    </p>
                    <OpsStatusPill label={lastRun === "Never" ? "Never run" : String(c.status)} tone={tone} />
                  </div>
                  <p className="text-xs text-gray-600">
                    {String(c.schedule)} · Last: {lastRun} · Next: {String(c.nextRun || "NA")}
                  </p>
                  {c.lastError ? <p className="mt-1 text-xs text-red-700">{String(c.lastError)}</p> : null}
                  <div className="mt-1 flex gap-2 text-xs">
                    <button
                      disabled={!isSuperAdmin}
                      className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-green-900 disabled:opacity-50"
                      onClick={() =>
                        window.confirm("Run this cron now?") &&
                        runAction("Cron run", () =>
                          cronActionApi({ action: "run", cronId: c.id, confirm: true }).then(() => load(true))
                        )
                      }
                    >
                      <Play className="mr-1 inline h-3 w-3" />
                      Run
                    </button>
                    <button
                      disabled={!isSuperAdmin}
                      className="rounded border px-2 py-0.5 disabled:opacity-50"
                      onClick={() =>
                        window.confirm("Enable this cron?") &&
                        runAction("Enable cron", () =>
                          cronActionApi({ action: "enable", cronId: c.id, confirm: true }).then(() => load(true))
                        )
                      }
                    >
                      Enable
                    </button>
                    <button
                      disabled={!isSuperAdmin}
                      className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-red-800 disabled:opacity-50"
                      onClick={() =>
                        window.confirm("Disable this cron?") &&
                        runAction("Disable cron", () =>
                          cronActionApi({ action: "disable", cronId: c.id, confirm: true }).then(() => load(true))
                        )
                      }
                    >
                      Disable
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">
            <ShieldAlert className="mr-1 inline h-4 w-4" />
            Alert Center
          </h3>
          <div className="space-y-2 text-sm">
            {alertItems.map((a) => {
              const tone = severityTone(a.severity);
              const c = TONE_CLASSES[tone];
              return (
                <div key={String(a.id)} className={`rounded-lg border p-2 ${c.bg} ${c.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${c.text}`}>
                      {String(a.type)} · {String(a.severity)}
                    </p>
                    <OpsStatusPill label={String(a.severity)} tone={tone} />
                  </div>
                  <p className="text-xs text-gray-700">{String(a.message)}</p>
                  <div className="mt-1 flex gap-2 text-xs">
                    <button
                      className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-green-900"
                      onClick={() =>
                        runAction("Resolve alert", () => alertActionApi({ alertId: a.id, action: "resolve" }).then(() => load(true)))
                      }
                    >
                      Resolve
                    </button>
                    <button className="rounded border px-2 py-0.5" onClick={() => runAction("Mute alert", () => alertActionApi({ alertId: a.id, action: "mute" }).then(() => load(true)))}>
                      Mute
                    </button>
                    <button className="rounded border px-2 py-0.5" onClick={() => runAction("Archive alert", () => alertActionApi({ alertId: a.id, action: "archive" }).then(() => load(true)))}>
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
            {!alertItems.length && (
              <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                No active alerts.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">
            <AlertTriangle className="mr-1 inline h-4 w-4" />
            Error Center
          </h3>
          <div className="mb-2 flex gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 ${TONE_CLASSES[countTone(criticalErrors, 1, 1)].badge}`}>
              Critical: {criticalErrors}
            </span>
            <span className={`rounded-full px-2 py-0.5 ${TONE_CLASSES[countTone(totalErrors, 1, 5)].badge}`}>
              Errors: {totalErrors}
            </span>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {errorItems.map((e) => {
              const tone = severityTone(e.severity);
              const c = TONE_CLASSES[tone];
              return (
                <div key={String(e.id)} className={`rounded-lg border p-2 ${c.bg} ${c.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${c.text}`}>
                      {String(e.module || e.type)} · {String(e.severity)}
                    </p>
                    <OpsStatusPill label={String(e.severity)} tone={tone} />
                  </div>
                  <p className="text-xs text-gray-700">{String(e.message)}</p>
                  <p className="text-xs text-gray-500">{String(e.createdAt)}</p>
                </div>
              );
            })}
            {!errorItems.length && (
              <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                No errors recorded.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">
            <Coins className="mr-1 inline h-4 w-4" />
            AI Cost Monitor
          </h3>
          <p className="text-sm">
            Today: {String((cost?.today as Record<string, unknown>)?.requests || 0)} requests ·{" "}
            {String((cost?.today as Record<string, unknown>)?.tokenUsage || 0)} tokens · $
            {String((cost?.today as Record<string, unknown>)?.estimatedCost || 0)}
          </p>
          <p className="text-sm">
            Month: {String((cost?.monthly as Record<string, unknown>)?.requests || 0)} requests ·{" "}
            {String((cost?.monthly as Record<string, unknown>)?.tokenUsage || 0)} tokens · $
            {String((cost?.monthly as Record<string, unknown>)?.estimatedCost || 0)}
          </p>
          <p className="mt-2 text-sm">
            Image cost: ${String(cost?.imageGenerationCost || 0)} · Voice cost: ${String(cost?.voiceGenerationCost || 0)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">Dependency Status</h3>
          <div className="grid gap-1 text-sm">
            {Object.entries(deps).map(([k, v]) => {
              const tone = dependencyTone(v);
              const c = TONE_CLASSES[tone];
              return (
                <div key={k} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${c.bg} ${c.border}`}>
                  <span className={`font-medium ${c.text}`}>{k}</span>
                  <div className="flex items-center gap-2">
                    <ToneIcon tone={tone} />
                    <OpsStatusPill label={String(v)} tone={tone} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Performance Monitor</h3>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          {[
            { label: "Queue latency", value: `${String((health?.performance as Record<string, unknown>)?.queueLatencyMs || 0)} ms` },
            { label: "Cron avg duration", value: `${String((health?.performance as Record<string, unknown>)?.cronExecutionAvgMs || 0)} ms` },
            { label: "Memory", value: String((health?.performance as Record<string, unknown>)?.memory || "placeholder") },
          ].map((item) => {
            const tone =
              item.label.includes("latency") && Number((health?.performance as Record<string, unknown>)?.queueLatencyMs || 0) > 5000
                ? "warn"
                : "good";
            const c = TONE_CLASSES[tone];
            return (
              <p key={item.label} className={`rounded-lg border px-3 py-2 ${c.bg} ${c.border} ${c.text}`}>
                {item.label}: {item.value}
              </p>
            );
          })}
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Maintenance Mode & Backup Center</h3>
        <p className="mb-2 text-xs text-gray-500">Automatic recovery is restricted to safe retries and queue state operations.</p>
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            maintenanceEnabled ? TONE_CLASSES.warn.bg + " " + TONE_CLASSES.warn.border + " " + TONE_CLASSES.warn.text : TONE_CLASSES.good.bg + " " + TONE_CLASSES.good.border + " " + TONE_CLASSES.good.text
          }`}
        >
          {maintenanceEnabled ? "Maintenance mode is ON — public site may show maintenance message" : "Maintenance mode is OFF — site is live"}
        </div>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={maintenanceEnabled} onChange={(e) => setMaintenanceEnabled(e.target.checked)} />
            Enable maintenance mode
          </label>
          <input
            className="rounded border px-2 py-1"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Maintenance message"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            disabled={!isSuperAdmin}
            className="rounded border border-green-300 bg-green-50 px-2 py-1 text-green-900 disabled:opacity-50"
            onClick={saveSettings}
          >
            Save settings
          </button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Manual backup placeholder triggered")}>
            Manual backup (placeholder)
          </button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Export configuration placeholder ready")}>
            Export configuration
          </button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Restore workflow placeholder only")}>
            Restore workflow (placeholder)
          </button>
        </div>
        <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
          <label>
            Health interval(min)
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              value={Number(settingsDraft.healthCheckInterval || 5)}
              onChange={(e) => setSettingsDraft((p) => ({ ...p, healthCheckInterval: Number(e.target.value) }))}
            />
          </label>
          <label>
            Max retry attempts
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              value={Number(settingsDraft.maxRetryAttempts || 3)}
              onChange={(e) => setSettingsDraft((p) => ({ ...p, maxRetryAttempts: Number(e.target.value) }))}
            />
          </label>
          <label>
            Queue warning threshold
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              type="number"
              value={Number(settingsDraft.queueWarningThreshold || 100)}
              onChange={(e) => setSettingsDraft((p) => ({ ...p, queueWarningThreshold: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
          {Object.entries((settingsDraft.automationToggles as Record<string, unknown>) || {}).map(([k, v]) => {
            const enabled = Boolean(v);
            const c = enabled ? TONE_CLASSES.good : TONE_CLASSES.bad;
            return (
              <label key={k} className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${c.bg} ${c.border}`}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setSettingsDraft((p) => ({
                      ...p,
                      automationToggles: {
                        ...((p.automationToggles as Record<string, unknown>) || {}),
                        [k]: e.target.checked,
                      },
                    }))
                  }
                />
                <span className={c.text}>{k}</span>
                <OpsStatusPill label={enabled ? "On" : "Off"} tone={enabled ? "good" : "bad"} className="ml-auto" />
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Admin Action History</h3>
        <div className="max-h-80 space-y-2 overflow-auto text-sm">
          {logItems.map((l) => {
            const tone = severityTone(l.severity);
            const c = TONE_CLASSES[tone === "good" ? "neutral" : tone];
            return (
              <OpsStatusCard key={String(l.id)} tone={tone === "good" ? "neutral" : tone}>
                <p className={`font-medium ${c.text}`}>
                  {String(l.type)} · {String(l.module)} · {String(l.severity)}
                </p>
                <p className="text-xs text-gray-700">{String(l.message)}</p>
                <p className="text-xs text-gray-500">
                  {String(l.createdAt)} · by {String(l.createdBy || "system")}
                </p>
              </OpsStatusCard>
            );
          })}
          {!logItems.length && <p className="text-gray-500">No admin actions logged yet.</p>}
        </div>
      </div>
    </RoleGuard>
  );
}
