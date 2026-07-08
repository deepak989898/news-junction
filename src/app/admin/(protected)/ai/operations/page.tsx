"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, Coins, DatabaseZap, Play, RefreshCw, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
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

export default function OperationsCenterPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [queues, setQueues] = useState<Record<string, unknown> | null>(null);
  const [cron, setCron] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Record<string, unknown> | null>(null);
  const [cost, setCost] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [qSearch, setQSearch] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});

  const load = async () => {
    const [h, q, c, e, a, co, l, s] = await Promise.all([
      getOpsHealthApi(),
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
    setSettings(s as Record<string, unknown>);
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

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Operations Control Center"
        actions={
          <button onClick={() => load()} className="rounded border px-3 py-1 text-sm">
            <RefreshCw className="mr-1 inline h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Overall system health</p><p className="text-2xl font-bold">{String((health?.overall as Record<string, unknown>)?.status || "unknown")}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Queue failed</p><p className="text-2xl font-bold">{String((queues?.counts as Record<string, unknown>)?.failed || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Today's AI requests</p><p className="text-2xl font-bold">{String((cost?.today as Record<string, unknown>)?.requests || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Monthly estimated cost</p><p className="text-2xl font-bold">${String((cost?.monthly as Record<string, unknown>)?.estimatedCost || 0)}</p></div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]"><Activity className="mr-1 inline h-4 w-4" />System Health Dashboard</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {healthItems.map((h) => (
            <div key={String(h.key)} className="rounded border p-2 text-sm">
              <p className="font-semibold">{String(h.label)}</p>
              <p>Status: {String(h.status)}</p>
              <p>Last checked: {String(h.lastChecked || "NA")}</p>
              <p>Response: {String(h.responseTimeMs ?? "NA")} ms</p>
              <p>Error count: {String(h.errorCount || 0)}</p>
              <p>Recovery attempts: {String(h.recoveryAttempts || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><DatabaseZap className="mr-1 inline h-4 w-4" />Queue Manager</h3>
          <div className="mb-2 flex gap-2">
            <input value={qSearch} onChange={(e) => setQSearch(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Search queue id/service/error" />
            <button className="rounded border px-3 py-1 text-sm" onClick={() => getOpsQueuesApi(undefined, qSearch).then((d) => setQueues(d as Record<string, unknown>))}>Find</button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <button className="rounded border px-2 py-1" onClick={() => queueActionApi({ action: "pause_queue" }).then(load)}>Pause queue</button>
            <button className="rounded border px-2 py-1" onClick={() => queueActionApi({ action: "resume_queue" }).then(load)}>Resume queue</button>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {queueItems.map((q) => (
              <div key={String(q.id)} className="rounded border p-2">
                <p className="font-medium">{String(q.service)} · {String(q.status)}</p>
                <p className="text-xs text-gray-500">{String(q.queue)} · {String(q.id)}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button className="rounded border px-2 py-0.5" onClick={() => queueActionApi({ action: "retry_failed", queue: q.queue, jobId: q.id }).then(load)}>Retry</button>
                  <button className="rounded border px-2 py-0.5" onClick={() => queueActionApi({ action: "cancel_pending", queue: q.queue, jobId: q.id }).then(load)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><Clock3 className="mr-1 inline h-4 w-4" />Cron Manager</h3>
          <div className="space-y-2 text-sm">
            {cronItems.map((c) => (
              <div key={String(c.id)} className="rounded border p-2">
                <p className="font-medium">{String(c.name)} · {String(c.status)}</p>
                <p className="text-xs text-gray-500">{String(c.schedule)} · Last: {String(c.lastRun || "Never")} · Next: {String(c.nextRun || "NA")}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button className="rounded border px-2 py-0.5" onClick={() => window.confirm("Run this cron now?") && cronActionApi({ action: "run", cronId: c.id, confirm: true }).then(load)}><Play className="mr-1 inline h-3 w-3" />Run</button>
                  <button className="rounded border px-2 py-0.5" onClick={() => window.confirm("Enable this cron?") && cronActionApi({ action: "enable", cronId: c.id, confirm: true }).then(load)}>Enable</button>
                  <button className="rounded border px-2 py-0.5" onClick={() => window.confirm("Disable this cron?") && cronActionApi({ action: "disable", cronId: c.id, confirm: true }).then(load)}>Disable</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><ShieldAlert className="mr-1 inline h-4 w-4" />Alert Center</h3>
          <div className="space-y-2 text-sm">
            {alertItems.map((a) => (
              <div key={String(a.id)} className="rounded border p-2">
                <p className="font-medium">{String(a.type)} · {String(a.severity)}</p>
                <p className="text-xs text-gray-600">{String(a.message)}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button className="rounded border px-2 py-0.5" onClick={() => alertActionApi({ alertId: a.id, action: "resolve" }).then(load)}>Resolve</button>
                  <button className="rounded border px-2 py-0.5" onClick={() => alertActionApi({ alertId: a.id, action: "mute" }).then(load)}>Mute</button>
                  <button className="rounded border px-2 py-0.5" onClick={() => alertActionApi({ alertId: a.id, action: "archive" }).then(load)}>Archive</button>
                </div>
              </div>
            ))}
            {!alertItems.length && <p className="text-gray-500">No active alerts.</p>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><AlertTriangle className="mr-1 inline h-4 w-4" />Error Center</h3>
          <div className="space-y-2 text-sm">
            {errorItems.map((e) => (
              <div key={String(e.id)} className="rounded border p-2">
                <p className="font-medium">{String(e.module || e.type)} · {String(e.severity)}</p>
                <p className="text-xs text-gray-600">{String(e.message)}</p>
                <p className="text-xs text-gray-500">{String(e.createdAt)}</p>
              </div>
            ))}
            {!errorItems.length && <p className="text-gray-500">No errors recorded.</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><Coins className="mr-1 inline h-4 w-4" />AI Cost Monitor</h3>
          <p className="text-sm">Today: {String((cost?.today as Record<string, unknown>)?.requests || 0)} requests · {String((cost?.today as Record<string, unknown>)?.tokenUsage || 0)} tokens · ${String((cost?.today as Record<string, unknown>)?.estimatedCost || 0)}</p>
          <p className="text-sm">Month: {String((cost?.monthly as Record<string, unknown>)?.requests || 0)} requests · {String((cost?.monthly as Record<string, unknown>)?.tokenUsage || 0)} tokens · ${String((cost?.monthly as Record<string, unknown>)?.estimatedCost || 0)}</p>
          <p className="mt-2 text-sm">Image cost: ${String(cost?.imageGenerationCost || 0)} · Voice cost: ${String(cost?.voiceGenerationCost || 0)}</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">Dependency Status</h3>
          <div className="grid gap-1 text-sm">
            {Object.entries(deps).map(([k, v]) => (
              <p key={k} className="rounded border px-2 py-1">{k}: {String(v)}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Performance Monitor</h3>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <p className="rounded border px-2 py-1">Queue latency: {String((health?.performance as Record<string, unknown>)?.queueLatencyMs || 0)} ms</p>
          <p className="rounded border px-2 py-1">Cron avg duration: {String((health?.performance as Record<string, unknown>)?.cronExecutionAvgMs || 0)} ms</p>
          <p className="rounded border px-2 py-1">Memory: {String((health?.performance as Record<string, unknown>)?.memory || "placeholder")}</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Maintenance Mode & Backup Center</h3>
        <p className="mb-2 text-xs text-gray-500">Automatic recovery is restricted to safe retries and queue state operations.</p>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <label><input type="checkbox" checked={maintenanceEnabled} onChange={(e) => setMaintenanceEnabled(e.target.checked)} /> Enable maintenance mode</label>
          <input className="rounded border px-2 py-1" value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} placeholder="Maintenance message" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            disabled={adminUser?.role !== "super_admin"}
            className="rounded border px-2 py-1 disabled:opacity-50"
            onClick={() =>
              window.confirm("Apply maintenance mode change?")
                && updateMaintenanceModeApi({
                  maintenanceMode: maintenanceEnabled,
                  maintenanceMessage,
                  adminWhitelist: [],
                  ...settingsDraft,
                  confirm: true,
                }).then(() => {
                  toast.success("Maintenance settings updated");
                  return load();
                })
            }
          >
            Save maintenance
          </button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Manual backup placeholder triggered")}>Manual backup (placeholder)</button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Export configuration placeholder ready")}>Export configuration</button>
          <button className="rounded border px-2 py-1" onClick={() => toast.success("Restore workflow placeholder only")}>Restore workflow (placeholder)</button>
        </div>
        <div className="mt-4 grid gap-2 text-xs md:grid-cols-3">
          <label>Health interval(min)
            <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.healthCheckInterval || 5)} onChange={(e) => setSettingsDraft((p) => ({ ...p, healthCheckInterval: Number(e.target.value) }))} />
          </label>
          <label>Max retry attempts
            <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.maxRetryAttempts || 3)} onChange={(e) => setSettingsDraft((p) => ({ ...p, maxRetryAttempts: Number(e.target.value) }))} />
          </label>
          <label>Queue warning threshold
            <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.queueWarningThreshold || 100)} onChange={(e) => setSettingsDraft((p) => ({ ...p, queueWarningThreshold: Number(e.target.value) }))} />
          </label>
        </div>
        <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
          {Object.entries((settingsDraft.automationToggles as Record<string, unknown>) || {}).map(([k, v]) => (
            <label key={k} className="rounded border px-2 py-1">
              <input
                type="checkbox"
                checked={Boolean(v)}
                onChange={(e) =>
                  setSettingsDraft((p) => ({
                    ...p,
                    automationToggles: {
                      ...((p.automationToggles as Record<string, unknown>) || {}),
                      [k]: e.target.checked,
                    },
                  }))
                }
              />{" "}
              {k}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Admin Action History</h3>
        <div className="space-y-2 text-sm">
          {logItems.map((l) => (
            <div key={String(l.id)} className="rounded border p-2">
              <p className="font-medium">{String(l.type)} · {String(l.module)} · {String(l.severity)}</p>
              <p className="text-xs text-gray-600">{String(l.message)}</p>
              <p className="text-xs text-gray-500">{String(l.createdAt)} · by {String(l.createdBy || "system")}</p>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
