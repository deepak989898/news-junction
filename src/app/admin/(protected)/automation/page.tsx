"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Clock, CheckCircle, AlertTriangle, Copy, XCircle } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import StatsCard from "@/components/admin/StatsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import {
  getAutomationSettingsClient,
  updateAutomationSettingsClient,
  getAutomationStatsClient,
  getAutomationLogsClient,
} from "@/firebase/firestore";
import { AutomationSettings, AutomationLog } from "@/lib/automation/types";
import { triggerAutomation } from "@/lib/automation/client-api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function AutomationDashboardPage() {
  const { adminUser } = useAuth();
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const load = async () => {
    const [s, st, lg] = await Promise.all([
      getAutomationSettingsClient(),
      getAutomationStatsClient(),
      getAutomationLogsClient(15),
    ]);
    setSettings(s);
    setStats(st);
    setLogs(lg);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleAutomation = async (enabled: boolean) => {
    await updateAutomationSettingsClient({ automationEnabled: enabled });
    setSettings((p) => p ? { ...p, automationEnabled: enabled } : p);
    toast.success(enabled ? "Automation enabled" : "Automation disabled");
  };

  const handleTrigger = async (action: "fetch" | "process") => {
    if (adminUser?.role !== "super_admin") {
      toast.error("Super admin required");
      return;
    }
    setTriggering(action);
    try {
      const result = await triggerAutomation(action);
      toast.success(`${action} completed: ${JSON.stringify(result)}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setTriggering(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="Automation"
        actions={
          <Link href="/admin/automation/queue" className="rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white">
            Approval Queue ({stats.pendingApproval || 0})
          </Link>
        }
      />

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        {adminUser?.role === "super_admin" ? (
          <ToggleSwitch
            label="Automation Enabled"
            checked={settings?.automationEnabled || false}
            onChange={toggleAutomation}
            description="When enabled, cron jobs will fetch and process news automatically"
          />
        ) : (
          <p className="text-sm">
            Automation: <strong>{settings?.automationEnabled ? "Enabled" : "Disabled"}</strong>
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/automation/settings" className="rounded-lg border px-4 py-2 text-sm font-medium">
            Automation Settings
          </Link>
          {adminUser?.role === "super_admin" && (
            <>
              <button
                onClick={() => handleTrigger("fetch")}
                disabled={!!triggering}
                className="rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {triggering === "fetch" ? "Fetching..." : "Run Fetch Now"}
              </button>
              <button
                onClick={() => handleTrigger("process")}
                disabled={!!triggering}
                className="rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {triggering === "process" ? "Processing..." : "Run Process Now"}
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Last fetch: {settings?.lastFetchRun ? new Date(settings.lastFetchRun).toLocaleString() : "Never"} ·
          Last process: {settings?.lastProcessRun ? new Date(settings.lastProcessRun).toLocaleString() : "Never"}
        </p>
        <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <strong>Workflow:</strong> Run Fetch → Run Process (AI writes articles) → Approval Queue → Approve ✓ to publish on website.
          Only items with status <strong>Pending Approval</strong> show the green approve button. Click Process multiple times until Pending Approval count rises.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Fetched Today" value={stats.fetchedToday || 0} icon={Zap} color="navy" />
        <StatsCard title="Processed Today" value={stats.processedToday || 0} icon={Clock} color="blue" />
        <StatsCard title="Published Today" value={stats.publishedToday || 0} icon={CheckCircle} color="green" />
        <StatsCard title="Pending Approval" value={stats.pendingApproval || 0} icon={AlertTriangle} color="red" />
        <StatsCard title="Failed" value={stats.failed || 0} icon={XCircle} color="red" />
        <StatsCard title="Duplicates" value={stats.duplicates || 0} icon={Copy} color="navy" />
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-bold text-[#1a2b4c]">Recent Automation Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No logs yet. Enable automation and run fetch.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-b border-gray-100 pb-2 text-sm last:border-0">
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                  log.type === "error" ? "bg-red-100 text-red-700" :
                  log.type === "publish" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{log.type}</span>
                <span className="text-gray-700">{log.message}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RoleGuard>
  );
}
