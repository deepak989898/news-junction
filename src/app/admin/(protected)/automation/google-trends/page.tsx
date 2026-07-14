"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { RefreshCw, Play, Check, X, Search } from "lucide-react";
import Link from "next/link";

interface TrendRow {
  id: string;
  title: string;
  category: string;
  mappedCategoryId: string;
  searchVolume: number;
  status: string;
  riskLevel: string;
  priorityScore: number;
  duplicateScore: number;
  trendStatus: string;
  articleId?: string;
  verificationNotes?: string;
  errorMessage?: string;
  isTestRecord?: boolean;
}

interface Settings {
  enabled: boolean;
  mode: string;
  country: string;
  officialApiConfigured: boolean;
  maximumTopicsPerRun: number;
  minimumVerifiedSources: number;
  minimumSearchVolume?: number;
  autoPublishLowRisk: boolean;
  lastFetchRun: string | null;
  lastFetchSummary?: {
    fetched: number;
    skipped: number;
    duplicates: number;
    errors: number;
    total: number;
    message: string;
  } | null;
}

export default function GoogleTrendsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<Array<{ id?: string; message?: string; status?: string; type?: string; createdAt?: string | null }>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/firebase/config");
    const user = getAuth(getFirebaseApp()).currentUser;
    if (!user) throw new Error("Not authenticated — please log in again");
    return user.getIdToken();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/google-trends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setTrends(data.trends || []);
      setSettings(data.settings);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Google Trends data");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: string, trendId?: string) => {
    setBusy(action + (trendId || ""));
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/google-trends", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, trendId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (action === "fetch") {
        const msg =
          data.message ||
          `Saved ${data.fetched ?? 0} · skipped ${data.skipped ?? 0} · duplicates ${data.duplicates ?? 0} · RSS ${data.total ?? 0}`;
        if ((data.fetched ?? 0) > 0) toast.success(msg);
        else toast.error(msg || "Fetch finished but saved 0 trends");
      } else {
        toast.success(`${action} completed`);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = async () => {
    if (!settings) return;
    setBusy("toggle");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/google-trends", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: { enabled: !settings.enabled } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update settings");
      }
      toast.success(settings.enabled ? "Google Trends disabled" : "Google Trends enabled");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle");
    } finally {
      setBusy(null);
    }
  };

  const todayCount = trends.filter((t) => t.status === "fetched" || t.status === "verified").length;

  return (
    <RoleGuard>
      <div>
        <AdminTopbar title="Google Trends Automation" />
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">
                  Mode: <strong>{settings?.mode === "officialApi" && settings.officialApiConfigured ? "Official API" : "RSS (official export)"}</strong>
                  {" · "}Country: {settings?.country || "IN"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Trends are discovery signals only — articles require verified trusted RSS sources.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleEnabled}
                  disabled={!!busy}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${settings?.enabled ? "bg-green-600" : "bg-gray-500"}`}
                >
                  {settings?.enabled ? "Enabled" : "Disabled"}
                </button>
                <button onClick={() => runAction("fetch")} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-[#1a2b4c] px-3 py-2 text-sm text-white">
                  <Play size={14} /> Fetch Trends
                </button>
                <button onClick={() => runAction("research")} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                  <Search size={14} /> Research Sources
                </button>
                <button onClick={() => runAction("generate")} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                  Generate Articles
                </button>
                <button onClick={load} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Active pipeline</p><p className="font-bold">{todayCount}</p></div>
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Pending approval</p><p className="font-bold">{trends.filter((t) => t.status === "pendingApproval").length}</p></div>
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Published</p><p className="font-bold">{trends.filter((t) => t.status === "published").length}</p></div>
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Last fetch</p><p className="font-bold text-xs">{settings?.lastFetchRun ? new Date(settings.lastFetchRun).toLocaleString() : "Never"}</p></div>
            </div>
            {settings?.lastFetchSummary?.message ? (
              <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${(settings.lastFetchSummary.fetched || 0) > 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                <strong>Last fetch result:</strong> {settings.lastFetchSummary.message}
                <span className="block text-xs mt-1 opacity-80">
                  RSS {settings.lastFetchSummary.total} · saved {settings.lastFetchSummary.fetched} · skipped {settings.lastFetchSummary.skipped} · duplicates {settings.lastFetchSummary.duplicates} · errors {settings.lastFetchSummary.errors}
                </span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <LoadingSpinner size="lg" />
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Trend</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trends.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                          No trends saved yet. Click <strong>Fetch Trends</strong> — if the toast says duplicates/skipped, there is nothing new to show.
                        </td>
                      </tr>
                    )}
                    {trends.slice(0, 50).map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 font-medium">{t.title}</p>
                          {t.verificationNotes && <p className="text-xs text-gray-500 line-clamp-1">{t.verificationNotes}</p>}
                          {t.errorMessage && <p className="text-xs text-red-500 line-clamp-1">{t.errorMessage}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs">{t.category}<br /><span className="text-gray-500">{t.mappedCategoryId}</span></td>
                        <td className="px-4 py-3">{t.searchVolume.toLocaleString()}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{t.status}</span></td>
                        <td className="px-4 py-3">{t.riskLevel}</td>
                        <td className="px-4 py-3">{t.priorityScore}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {t.status === "pendingApproval" && (
                              <>
                                <button onClick={() => runAction("approve", t.id)} title="Approve & Publish" className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                                <button onClick={() => runAction("reject", t.id)} title="Reject" className="rounded p-1 text-red-600 hover:bg-red-50"><X size={16} /></button>
                              </>
                            )}
                            {t.articleId && (
                              <Link href={`/admin/news/${t.articleId}/edit`} className="rounded p-1 text-blue-600 hover:bg-blue-50 text-xs">Edit</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Recent automation logs</h3>
              <ul className="space-y-1 max-h-48 overflow-y-auto text-xs text-gray-600">
                {logs.slice(0, 15).map((log, idx) => (
                  <li key={log.id || idx} className="border-b border-gray-50 py-1">
                    <span className="font-medium text-gray-800">{log.type || "log"}</span>
                    {log.status ? ` · ${log.status}` : ""} — {log.message || ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
