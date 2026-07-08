"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Boxes,
  GitBranchPlus,
  PlayCircle,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  emergencyOrchestratorActionApi,
  getOrchestratorHealthApi,
  getOrchestratorHistoryApi,
  getOrchestratorJobsApi,
  getOrchestratorModulesApi,
  getOrchestratorSettingsApi,
  getOrchestratorWorkflowsApi,
  saveOrchestratorWorkflowApi,
  toggleOrchestratorModuleApi,
  updateOrchestratorJobApi,
  updateOrchestratorSettingsApi,
} from "@/lib/orchestrator/client-api";

type Dict = Record<string, unknown>;

export default function OrchestratorPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Dict | null>(null);
  const [modules, setModules] = useState<Dict | null>(null);
  const [jobs, setJobs] = useState<Dict | null>(null);
  const [history, setHistory] = useState<Dict | null>(null);
  const [health, setHealth] = useState<Dict | null>(null);
  const [settings, setSettings] = useState<Dict | null>(null);
  const [wfName, setWfName] = useState("custom-workflow");
  const [jobSearch, setJobSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const load = async () => {
    const [wf, mo, jo, hi, he, se] = await Promise.all([
      getOrchestratorWorkflowsApi(),
      getOrchestratorModulesApi(),
      getOrchestratorJobsApi({ q: jobSearch || undefined }),
      getOrchestratorHistoryApi({ q: historySearch || undefined }),
      getOrchestratorHealthApi(),
      getOrchestratorSettingsApi(),
    ]);
    setWorkflows(wf as Dict);
    setModules(mo as Dict);
    setJobs(jo as Dict);
    setHistory(hi as Dict);
    setHealth(he as Dict);
    setSettings(se as Dict);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load orchestrator");
      setLoading(false);
    });
  }, []);

  const workflowDefs = useMemo(() => ((workflows?.definitions as Dict[]) || []).slice(0, 30), [workflows]);
  const moduleItems = useMemo(() => ((modules?.items as Dict[]) || []).slice(0, 40), [modules]);
  const jobItems = useMemo(() => ((jobs?.items as Dict[]) || []).slice(0, 120), [jobs]);
  const historyItems = useMemo(() => ((history?.items as Dict[]) || []).slice(0, 80), [history]);
  const timeline = useMemo(() => ((health?.timeline as Dict[]) || []).slice(0, 80), [health]);
  const failures = useMemo(() => ((health?.mostCommonFailures as Dict[]) || []).slice(0, 12), [health]);
  const overview = (health?.overview || {}) as Dict;

  const settingsDraft = settings || {};
  const isSuper = adminUser?.role === "super_admin";

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Master Orchestrator"
        actions={
          <button onClick={() => load()} className="rounded border px-3 py-1 text-sm">
            <RefreshCw className="mr-1 inline h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Success rate</p><p className="text-2xl font-bold">{String(overview.successRate || 0)}%</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Failure rate</p><p className="text-2xl font-bold">{String(overview.failureRate || 0)}%</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Active workflows</p><p className="text-2xl font-bold">{String(overview.activeWorkflows || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Pending workflows</p><p className="text-2xl font-bold">{String(overview.pendingWorkflows || 0)}</p></div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]"><Workflow className="mr-1 inline h-4 w-4" />Workflow Builder</h3>
        <p className="mb-2 text-xs text-gray-500">Visual drag-and-drop placeholder with validation. Ordering/enable/conditional/retry/timeout is persisted in workflow definition JSON.</p>
        <div className="mb-2 flex gap-2">
          <input value={wfName} onChange={(e) => setWfName(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Workflow name" />
          <button
            disabled={!isSuper}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            onClick={() =>
              saveOrchestratorWorkflowApi({
                action: "create",
                name: wfName,
                description: "Custom workflow from orchestrator UI",
                trigger: "manual",
                enabled: true,
                steps: [
                  { id: "step_1", name: "AI Rewrite", module: "AI Content Studio", enabled: true, timeoutSec: 180, retryLimit: 2, condition: "if article exists" },
                  { id: "step_2", name: "Editorial Review", module: "AI Editorial Manager", enabled: true, timeoutSec: 180, retryLimit: 2 },
                  { id: "step_3", name: "SEO Optimization", module: "AI SEO Manager", enabled: true, timeoutSec: 180, retryLimit: 2, parallelGroup: "post_process" },
                ],
              }).then(() => {
                toast.success("Workflow created");
                return load();
              })
            }
          >
            <GitBranchPlus className="mr-1 inline h-4 w-4" />Create Workflow
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {workflowDefs.map((w) => (
            <div key={String(w.id)} className="rounded border p-2">
              <p className="font-medium">{String(w.name)} · trigger: {String(w.trigger)} · {Boolean(w.enabled) ? "enabled" : "disabled"}</p>
              <p className="text-xs text-gray-500">Steps: {String(((w.steps as Dict[]) || []).length)}</p>
              <div className="mt-1 flex gap-2 text-xs">
                <button className="rounded border px-2 py-0.5" onClick={() => saveOrchestratorWorkflowApi({ action: "run", workflowId: w.id, trigger: "manual", priority: "high" }).then(load)}><PlayCircle className="mr-1 inline h-3 w-3" />Run</button>
                {isSuper && (
                  <button className="rounded border px-2 py-0.5" onClick={() => window.confirm("Delete workflow?") && saveOrchestratorWorkflowApi({ action: "delete", id: w.id }).then(load)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><Boxes className="mr-1 inline h-4 w-4" />Registered Modules</h3>
          <div className="space-y-2 text-sm">
            {moduleItems.map((m) => (
              <div key={String(m.id)} className="rounded border p-2">
                <p className="font-medium">{String(m.name)} · {String(m.version)}</p>
                <p className="text-xs text-gray-500">status: {String(m.status)} · health: {String(m.health)} · errors: {String(m.errorCount || 0)}</p>
                <p className="text-xs text-gray-500">last exec: {String(m.lastExecution || "NA")}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button
                    disabled={!isSuper}
                    className="rounded border px-2 py-0.5 disabled:opacity-50"
                    onClick={() => toggleOrchestratorModuleApi({ moduleId: m.id, enabled: !Boolean(m.enabled), confirm: true }).then(load)}
                  >
                    {Boolean(m.enabled) ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><Activity className="mr-1 inline h-4 w-4" />Workflow Timeline & Failures</h3>
          <div className="mb-3 max-h-56 space-y-2 overflow-auto text-sm">
            {timeline.map((t) => (
              <div key={String(t.id)} className="rounded border p-2">
                <p className="font-medium">{String(t.workflowName)} · {String(t.status)}</p>
                <p className="text-xs text-gray-500">{String(t.startedAt)} → {String(t.completedAt || "running")}</p>
              </div>
            ))}
          </div>
          <p className="mb-1 text-xs font-semibold text-gray-600">Most common failures</p>
          <div className="space-y-1 text-xs">
            {failures.map((f, idx) => (
              <p key={`${String(f.error)}-${idx}`} className="rounded border px-2 py-1">{String(f.error)} · {String(f.count)}</p>
            ))}
            {!failures.length && <p className="text-gray-500">No recurring failures detected.</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><AlertOctagon className="mr-1 inline h-4 w-4" />Queue Overview / Jobs</h3>
          <div className="mb-2 flex gap-2">
            <input value={jobSearch} onChange={(e) => setJobSearch(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Search jobs" />
            <button className="rounded border px-3 py-1 text-sm" onClick={() => getOrchestratorJobsApi({ q: jobSearch }).then((d) => setJobs(d as Dict))}>Find</button>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {jobItems.map((j) => (
              <div key={String(j.id)} className="rounded border p-2">
                <p className="font-medium">{String(j.stepName)} · {String(j.status)} · {String(j.priority)}</p>
                <p className="text-xs text-gray-500">{String(j.workflowName)} · {String(j.module)}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button disabled={!isSuper} className="rounded border px-2 py-0.5 disabled:opacity-50" onClick={() => updateOrchestratorJobApi({ action: "retry", jobId: j.id, confirm: true }).then(load)}>Retry</button>
                  <button disabled={!isSuper} className="rounded border px-2 py-0.5 disabled:opacity-50" onClick={() => updateOrchestratorJobApi({ action: "cancel", jobId: j.id, confirm: true }).then(load)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">Workflow History</h3>
          <div className="mb-2 flex gap-2">
            <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Search history" />
            <button className="rounded border px-3 py-1 text-sm" onClick={() => getOrchestratorHistoryApi({ q: historySearch }).then((d) => setHistory(d as Dict))}>Find</button>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {historyItems.map((h) => (
              <div key={String(h.id)} className="rounded border p-2">
                <p className="font-medium">{String(h.workflowName)} · {String(h.status)}</p>
                <p className="text-xs text-gray-500">trigger: {String(h.trigger)} · started: {String(h.startedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><Settings2 className="mr-1 inline h-4 w-4" />Global Orchestrator Settings</h3>
          <div className="grid gap-2 text-sm">
            <label><input type="checkbox" checked={Boolean(settingsDraft.enabled)} onChange={(e) => setSettings((p) => ({ ...(p || {}), enabled: e.target.checked }))} /> Orchestrator enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.parallelExecution)} onChange={(e) => setSettings((p) => ({ ...(p || {}), parallelExecution: e.target.checked }))} /> Parallel execution</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.safeMode)} onChange={(e) => setSettings((p) => ({ ...(p || {}), safeMode: e.target.checked }))} /> Safe mode</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.maintenanceMode)} onChange={(e) => setSettings((p) => ({ ...(p || {}), maintenanceMode: e.target.checked }))} /> Maintenance mode</label>
            <label>Max concurrent jobs
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.maxConcurrentJobs || 8)} onChange={(e) => setSettings((p) => ({ ...(p || {}), maxConcurrentJobs: Number(e.target.value) }))} />
            </label>
            <label>Global retry limit
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.globalRetryLimit || 3)} onChange={(e) => setSettings((p) => ({ ...(p || {}), globalRetryLimit: Number(e.target.value) }))} />
            </label>
            <label>Workflow timeout (sec)
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.workflowTimeout || 900)} onChange={(e) => setSettings((p) => ({ ...(p || {}), workflowTimeout: Number(e.target.value) }))} />
            </label>
            <button
              disabled={!isSuper}
              className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              onClick={() =>
                window.confirm("Apply orchestrator settings?")
                  && updateOrchestratorSettingsApi({ ...(settings || {}), confirm: true }).then(() => {
                    toast.success("Orchestrator settings updated");
                    return load();
                  })
              }
            >
              Save Settings
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]"><ShieldAlert className="mr-1 inline h-4 w-4" />Emergency Controls</h3>
          <p className="mb-2 text-xs text-gray-500">Every emergency action requires explicit confirmation and is audit logged.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button disabled={!isSuper} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => window.confirm("Pause all automation?") && emergencyOrchestratorActionApi({ action: "pause_all", confirm: true }).then(load)}>Pause all automation</button>
            <button disabled={!isSuper} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => window.confirm("Resume all automation?") && emergencyOrchestratorActionApi({ action: "resume_all", confirm: true }).then(load)}>Resume automation</button>
            <button disabled={!isSuper} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => window.confirm("Cancel queued workflows?") && emergencyOrchestratorActionApi({ action: "cancel_queued_workflows", confirm: true }).then(load)}>Cancel queued workflows</button>
            <button disabled={!isSuper} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => window.confirm("Restart safe queues?") && emergencyOrchestratorActionApi({ action: "restart_safe_queues", confirm: true }).then(load)}>Restart safe queues</button>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
