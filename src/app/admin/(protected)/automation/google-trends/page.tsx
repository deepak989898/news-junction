"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { RefreshCw, Play, Check, X, Search, Loader2, Trash2, Eye, FilePlus2, Settings2, Zap, ChevronDown, ChevronUp } from "lucide-react";
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
  fetchBatchId?: string | null;
  fetchedAt?: string | null;
  createdAt?: string | null;
}

interface Settings {
  enabled: boolean;
  mode: string;
  country: string;
  officialApiConfigured: boolean;
  maximumTopicsPerRun: number;
  maximumArticlesPerDay: number;
  maximumArticlesPerCategoryPerDay: number;
  minimumVerifiedSources: number;
  minimumSearchVolume?: number;
  activeOnly: boolean;
  autoResearch: boolean;
  autoGenerate: boolean;
  autoPublishLowRisk: boolean;
  autoPublishMediumRisk: boolean;
  highRiskAlwaysApproval: boolean;
  autoPostToSocial: boolean;
  lastFetchRun: string | null;
  lastResearchRun?: string | null;
  lastProcessRun?: string | null;
  lastPublishRun?: string | null;
  lastFetchSummary?: {
    fetched: number;
    skipped: number;
    duplicates: number;
    errors: number;
    total: number;
    message: string;
  } | null;
}

type SettingsPatch = Partial<
  Pick<
    Settings,
    | "enabled"
    | "activeOnly"
    | "autoResearch"
    | "autoGenerate"
    | "autoPublishLowRisk"
    | "autoPublishMediumRisk"
    | "highRiskAlwaysApproval"
    | "autoPostToSocial"
    | "maximumTopicsPerRun"
    | "maximumArticlesPerDay"
    | "maximumArticlesPerCategoryPerDay"
    | "minimumVerifiedSources"
  >
>;

const PAGE_SIZE = 25;

function batchKey(t: TrendRow): string {
  if (t.fetchBatchId) return t.fetchBatchId;
  const raw = t.fetchedAt || t.createdAt || "";
  if (!raw) return "unknown";
  // Group legacy rows without fetchBatchId into ~10-minute buckets
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
  return d.toISOString();
}

function formatBatchLabel(key: string): string {
  if (key === "unknown") return "Earlier trends";
  const d = new Date(key);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleString();
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors ${
        disabled ? "opacity-60" : "cursor-pointer hover:bg-gray-50"
      } ${checked && !disabled ? "border-green-200 bg-green-50/40" : "border-gray-200"}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[#1a2b4c]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-gray-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1 ${
          checked ? "bg-green-600" : "bg-gray-300"
        } disabled:cursor-not-allowed`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  disabled,
  onSave,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value ?? ""));
  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  const commit = () => {
    const n = Math.max(min, Math.min(max, Number(draft) || min));
    setDraft(String(n));
    if (n !== value) onSave(n);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-20 rounded-lg border px-2 py-1 text-sm disabled:opacity-60"
      />
    </div>
  );
}

export default function GoogleTrendsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<Array<{ id?: string; message?: string; status?: string; type?: string; createdAt?: string | null }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showSettings, setShowSettings] = useState(false);
  const [autoStep, setAutoStep] = useState<string>("");

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

  const postAction = async (
    action: string,
    opts?: { trendId?: string; reason?: string; deleteArticle?: boolean },
    busyKey?: string
  ) => {
    setBusy(busyKey || action + (opts?.trendId || ""));
    try {
      const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
      return await runWithAdminBusy(
        action === "fetch"
          ? "Fetching Google Trends…"
          : action === "research"
            ? "Researching sources…"
            : action === "generate"
              ? "Generating article…"
              : action === "delete"
                ? "Deleting…"
                : `${action}… please wait`,
        async () => {
          const token = await getToken();
          const res = await fetch("/api/admin/google-trends", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action, ...opts }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Action failed");
          return data;
        }
      );
    } finally {
      setBusy(null);
    }
  };

  const runFetch = async () => {
    try {
      const data = await postAction("fetch");
      const msg =
        data.message ||
        `Saved ${data.fetched ?? 0} · skipped ${data.skipped ?? 0} · duplicates ${data.duplicates ?? 0} · RSS ${data.total ?? 0}`;
      if ((data.fetched ?? 0) > 0) toast.success(msg);
      else toast.error(msg || "Fetch finished but saved 0 trends");
      setVisibleCount(PAGE_SIZE);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fetch failed");
    }
  };

  const runResearch = async (trendId?: string) => {
    try {
      const data = await postAction("research", trendId ? { trendId } : undefined, trendId ? `research-${trendId}` : "research");
      toast.success(
        trendId
          ? data.verified
            ? "Sources verified — ready to generate"
            : "Research done (insufficient sources)"
          : `Research done: ${data.verified ?? 0} verified · ${data.insufficient ?? 0} insufficient`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Research failed");
    }
  };

  const runGenerateOne = async (trendId: string) => {
    try {
      const data = await postAction("generate", { trendId }, `generate-${trendId}`);
      toast.success(data.message || "Article generated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
      await load();
    }
  };

  const runGenerateAll = async () => {
    const verified = trends.filter((t) => t.status === "verified");
    if (verified.length === 0) {
      toast.error("No verified trends to generate. Click Research Sources first.");
      return;
    }
    setBusy("generate-all");
    let ok = 0;
    let failed = 0;
    try {
      const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
      await runWithAdminBusy(`Generating ${verified.length} articles one by one…`, async () => {
        for (let i = 0; i < verified.length; i++) {
          const t = verified[i];
          try {
            const token = await getToken();
            const res = await fetch("/api/admin/google-trends", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "generate", trendId: t.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generate failed");
            ok += 1;
          } catch {
            failed += 1;
          }
        }
      });
      toast.success(`Generated ${ok} article(s)${failed ? ` · ${failed} failed` : ""}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate all failed");
    } finally {
      setBusy(null);
    }
  };

  const runApprove = async (trendId: string) => {
    try {
      await postAction("approve", { trendId }, `approve-${trendId}`);
      toast.success("Approved & published");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
  };

  const runReject = async (trendId: string) => {
    try {
      await postAction("reject", { trendId, reason: "Rejected by admin" }, `reject-${trendId}`);
      toast.success("Rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    }
  };

  const runDelete = async (t: TrendRow) => {
    const withArticle = Boolean(t.articleId);
    const ok = window.confirm(
      withArticle
        ? `Delete trend "${t.title}"?\n\nAlso delete the generated news article? Click OK = delete trend + article, Cancel on next step can keep article.\nClick OK to continue.`
        : `Delete trend "${t.title}"?`
    );
    if (!ok) return;
    let deleteArticle = false;
    if (withArticle) {
      deleteArticle = window.confirm("Also permanently delete the linked news article from the site?");
    }
    try {
      await postAction("delete", { trendId: t.id, deleteArticle }, `delete-${t.id}`);
      toast.success(deleteArticle ? "Trend and article deleted" : "Trend deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const saveSettings = useCallback(
    async (patch: SettingsPatch, opts?: { silent?: boolean; busyKey?: string }) => {
      setBusy(opts?.busyKey || "settings");
      try {
        const token = await getToken();
        const res = await fetch("/api/admin/google-trends", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings: patch }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update settings");
        }
        setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
        if (!opts?.silent) toast.success("Settings saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save settings");
        await load();
      } finally {
        setBusy(null);
      }
    },
    [getToken, load]
  );

  const toggleEnabled = async () => {
    if (!settings) return;
    await saveSettings(
      { enabled: !settings.enabled },
      { silent: true, busyKey: "toggle" }
    );
    toast.success(settings.enabled ? "Automation disabled" : "Automation enabled");
  };

  const runFullAutomation = async () => {
    if (!settings?.enabled) {
      toast.error("Turn on automation (Enabled) first.");
      return;
    }
    setBusy("run-auto");
    let generated = 0;
    let failed = 0;
    try {
      const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
      await runWithAdminBusy("Running full Google Trends automation…", async () => {
        const token = await getToken();
        const call = async (body: Record<string, unknown>) => {
          const res = await fetch("/api/admin/google-trends", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Step failed");
          return data;
        };

        setAutoStep("Fetching latest trends…");
        await call({ action: "fetch" });

        setAutoStep("Researching & verifying sources…");
        await call({ action: "research" });

        // Reload to know which trends are verified now
        const listRes = await fetch("/api/admin/google-trends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listData = await listRes.json();
        const verified: TrendRow[] = (listData.trends || []).filter(
          (t: TrendRow) => t.status === "verified"
        );

        for (let i = 0; i < verified.length; i++) {
          setAutoStep(`Generating article ${i + 1}/${verified.length} (image + publish)…`);
          try {
            await call({ action: "generate", trendId: verified[i].id });
            generated += 1;
          } catch {
            failed += 1;
          }
        }
      });
      toast.success(
        `Automation run complete · ${generated} article(s) generated${failed ? ` · ${failed} failed` : ""}`
      );
      setVisibleCount(PAGE_SIZE);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Automation run failed");
      await load();
    } finally {
      setAutoStep("");
      setBusy(null);
    }
  };

  const batches = useMemo(() => {
    const map = new Map<string, TrendRow[]>();
    for (const t of trends) {
      const key = batchKey(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [trends]);

  const flatVisible = useMemo(() => {
    const ordered = batches.flatMap(([, rows]) => rows);
    return ordered.slice(0, visibleCount);
  }, [batches, visibleCount]);

  const visibleByBatch = useMemo(() => {
    const map = new Map<string, TrendRow[]>();
    for (const t of flatVisible) {
      const key = batchKey(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [flatVisible]);

  const hasMore = trends.length > visibleCount;
  const verifiedCount = trends.filter((t) => t.status === "verified").length;
  const todayCount = trends.filter((t) => t.status === "fetched" || t.status === "verified").length;

  const renderActions = (t: TrendRow) => {
    const rowBusy = busy?.includes(t.id);
    return (
      <div className="flex flex-wrap items-center gap-1">
        {(t.status === "fetched" || t.status === "insufficientSources" || t.status === "failed") && (
          <button
            onClick={() => runResearch(t.id)}
            disabled={!!busy}
            title="Research sources"
            className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[11px] disabled:opacity-50"
          >
            {busy === `research-${t.id}` ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Research
          </button>
        )}
        {t.status === "verified" && (
          <button
            onClick={() => runGenerateOne(t.id)}
            disabled={!!busy}
            title="Generate article"
            className="inline-flex items-center gap-0.5 rounded bg-[#1a2b4c] px-1.5 py-0.5 text-[11px] text-white disabled:opacity-50"
          >
            {busy === `generate-${t.id}` ? <Loader2 size={12} className="animate-spin" /> : <FilePlus2 size={12} />}
            Generate
          </button>
        )}
        {t.status === "pendingApproval" && (
          <>
            <button
              onClick={() => runApprove(t.id)}
              disabled={!!busy}
              title="Approve & publish"
              className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => runReject(t.id)}
              disabled={!!busy}
              title="Reject"
              className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </>
        )}
        {t.articleId && (
          <>
            <Link
              href={`/admin/news/${t.articleId}/edit`}
              className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-50"
              title="View / edit article"
            >
              <Eye size={12} />
              View
            </Link>
            <Link
              href={`/admin/news/${t.articleId}/edit`}
              className="rounded px-1.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-50"
            >
              Edit
            </Link>
          </>
        )}
        {!t.articleId && t.status === "pendingApproval" && (
          <span className="text-[11px] text-amber-700">Ready to approve</span>
        )}
        <button
          onClick={() => runDelete(t)}
          disabled={!!busy || !!rowBusy}
          title="Delete trend"
          className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
        >
          {busy === `delete-${t.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    );
  };

  return (
    <RoleGuard>
      <div>
        <AdminTopbar title="Google Trends Automation" />
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">
                  Mode:{" "}
                  <strong>
                    {settings?.mode === "officialApi" && settings.officialApiConfigured
                      ? "Official API"
                      : "RSS (official export)"}
                  </strong>
                  {" · "}Country: {settings?.country || "IN"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Auto mode (Enabled): scheduled crons Fetch → Research → Generate (image) → Publish per your settings.
                  Manual: Fetch → Research → Generate → Approve/Reject.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleEnabled}
                  disabled={!!busy}
                  title={settings?.enabled ? "Automation is ON — click to turn off" : "Automation is OFF — click to turn on"}
                  className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white ${settings?.enabled ? "bg-green-600" : "bg-gray-500"}`}
                >
                  {busy === "toggle" && <Loader2 size={14} className="animate-spin" />}
                  {settings?.enabled ? "Automation ON" : "Automation OFF"}
                </button>
                <button
                  onClick={runFullAutomation}
                  disabled={!!busy || !settings?.enabled}
                  title="Run the full pipeline now: Fetch → Research → Generate (image) → Auto-publish per settings"
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#c41e20] to-[#e85d04] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy === "run-auto" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {busy === "run-auto" ? "Running…" : "Run Automation Now"}
                </button>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  <Settings2 size={14} />
                  Settings
                  {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                  onClick={runFetch}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1a2b4c] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy === "fetch" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {busy === "fetch" ? "Fetching…" : "Fetch Trends"}
                </button>
                <button
                  onClick={() => runResearch()}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  {busy === "research" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {busy === "research" ? "Researching…" : "Research Sources"}
                </button>
                <button
                  onClick={runGenerateAll}
                  disabled={!!busy || verifiedCount === 0}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                  title={verifiedCount ? `Generate ${verifiedCount} verified trend(s) one by one` : "No verified trends"}
                >
                  {busy === "generate-all" ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />}
                  {busy === "generate-all" ? "Generating…" : `Generate All (${verifiedCount})`}
                </button>
                <button onClick={load} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">
                  <RefreshCw size={14} className={loading || busy ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Active pipeline</p>
                <p className="font-bold">{todayCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Pending approval</p>
                <p className="font-bold">{trends.filter((t) => t.status === "pendingApproval").length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Published</p>
                <p className="font-bold">{trends.filter((t) => t.status === "published").length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Last fetch</p>
                <p className="font-bold text-xs">
                  {settings?.lastFetchRun ? new Date(settings.lastFetchRun).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
            {autoStep ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <Loader2 size={14} className="animate-spin" />
                {autoStep}
              </div>
            ) : null}
            {settings?.lastFetchSummary?.message ? (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  (settings.lastFetchSummary.fetched || 0) > 0 ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
                }`}
              >
                <strong>Last fetch result:</strong> {settings.lastFetchSummary.message}
                <span className="mt-1 block text-xs opacity-80">
                  RSS {settings.lastFetchSummary.total} · saved {settings.lastFetchSummary.fetched} · skipped{" "}
                  {settings.lastFetchSummary.skipped} · duplicates {settings.lastFetchSummary.duplicates} · errors{" "}
                  {settings.lastFetchSummary.errors}
                </span>
              </div>
            ) : null}
          </div>

          {showSettings && settings && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 size={16} className="text-[#1a2b4c]" />
                <h3 className="text-sm font-semibold text-[#1a2b4c]">Automation Settings</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    What runs automatically
                  </p>
                  <div className="space-y-2">
                    <ToggleRow
                      label="Enable automation"
                      hint="Master switch. When on, scheduled crons run the pipeline."
                      checked={settings.enabled}
                      disabled={!!busy}
                      onChange={(v) => saveSettings({ enabled: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Auto-research sources"
                      hint="Automatically verify sources for fetched trends."
                      checked={settings.autoResearch}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ autoResearch: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Auto-generate articles + images"
                      hint="Automatically write articles and generate images for verified trends."
                      checked={settings.autoGenerate}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ autoGenerate: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Auto-publish low-risk"
                      hint="Publish low-risk articles automatically (sports, entertainment, tech)."
                      checked={settings.autoPublishLowRisk}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ autoPublishLowRisk: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Auto-publish medium-risk"
                      hint="Publish medium-risk articles automatically (business, general)."
                      checked={settings.autoPublishMediumRisk}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ autoPublishMediumRisk: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="High-risk always needs approval"
                      hint="Politics, crime, health, death etc. always wait for manual approval (recommended)."
                      checked={settings.highRiskAlwaysApproval}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ highRiskAlwaysApproval: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Auto-post to social media"
                      hint="When a trend article publishes, post it immediately to connected accounts (Facebook, Telegram). Connect accounts in AI Social Manager first."
                      checked={settings.autoPostToSocial}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ autoPostToSocial: v }, { silent: true })}
                    />
                    <ToggleRow
                      label="Active trends only"
                      hint="Skip trends that have already ended."
                      checked={settings.activeOnly}
                      disabled={!!busy || !settings.enabled}
                      onChange={(v) => saveSettings({ activeOnly: v }, { silent: true })}
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Limits
                  </p>
                  <div className="space-y-3">
                    <NumberRow
                      label="Max topics per run"
                      value={settings.maximumTopicsPerRun}
                      min={1}
                      max={50}
                      disabled={!!busy || !settings.enabled}
                      onSave={(v) => saveSettings({ maximumTopicsPerRun: v })}
                    />
                    <NumberRow
                      label="Max articles per day"
                      value={settings.maximumArticlesPerDay}
                      min={1}
                      max={100}
                      disabled={!!busy || !settings.enabled}
                      onSave={(v) => saveSettings({ maximumArticlesPerDay: v })}
                    />
                    <NumberRow
                      label="Max articles per category / day"
                      value={settings.maximumArticlesPerCategoryPerDay}
                      min={1}
                      max={50}
                      disabled={!!busy || !settings.enabled}
                      onSave={(v) => saveSettings({ maximumArticlesPerCategoryPerDay: v })}
                    />
                    <NumberRow
                      label="Minimum verified sources"
                      value={settings.minimumVerifiedSources}
                      min={1}
                      max={5}
                      disabled={!!busy || !settings.enabled}
                      onSave={(v) => saveSettings({ minimumVerifiedSources: v })}
                    />
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">Automatic schedule (daily)</p>
                    <p className="mt-1">Fetch → Research → Generate → Publish run on server crons every day.</p>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <span>Last fetch: {settings.lastFetchRun ? new Date(settings.lastFetchRun).toLocaleString() : "Never"}</span>
                      <span>Last research: {settings.lastResearchRun ? new Date(settings.lastResearchRun).toLocaleString() : "Never"}</span>
                      <span>Last generate: {settings.lastProcessRun ? new Date(settings.lastProcessRun).toLocaleString() : "Never"}</span>
                      <span>Last publish: {settings.lastPublishRun ? new Date(settings.lastPublishRun).toLocaleString() : "Never"}</span>
                    </div>
                    <p className="mt-2">Use <strong>Run Automation Now</strong> to trigger the whole cycle immediately.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingSpinner size="lg" />
          ) : (
            <div className="space-y-4">
              {trends.length === 0 && (
                <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
                  No trends saved yet. Click <strong>Fetch Trends</strong>.
                </div>
              )}

              {visibleByBatch.map(([key, rows], batchIndex) => (
                <div key={key} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {batchIndex === 0 ? "Latest fetch" : "Previous fetch"} · {formatBatchLabel(key)}
                      <span className="ml-2 font-normal text-gray-400">({rows.length})</span>
                    </p>
                  </div>
                  {batchIndex > 0 && <div className="border-t-2 border-dashed border-gray-200" />}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-white">
                        <tr>
                          <th className="px-4 py-2">Trend</th>
                          <th className="px-4 py-2">Category</th>
                          <th className="px-4 py-2">Volume</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Risk</th>
                          <th className="px-4 py-2">Score</th>
                          <th className="px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="line-clamp-2 font-medium">{t.title}</p>
                              {t.verificationNotes && (
                                <p className="line-clamp-1 text-xs text-gray-500">{t.verificationNotes}</p>
                              )}
                              {t.errorMessage && (
                                <p className="line-clamp-1 text-xs text-red-500">{t.errorMessage}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {t.category}
                              <br />
                              <span className="text-gray-500">{t.mappedCategoryId}</span>
                            </td>
                            <td className="px-4 py-3">{t.searchVolume.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold">{t.status}</span>
                            </td>
                            <td className="px-4 py-3">{t.riskLevel}</td>
                            <td className="px-4 py-3">{t.priorityScore}</td>
                            <td className="px-4 py-3">{renderActions(t)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="rounded-lg border border-[#1a2b4c] bg-white px-4 py-2 text-sm font-medium text-[#1a2b4c] hover:bg-gray-50"
                  >
                    Show more previous trends ({trends.length - visibleCount} more)
                  </button>
                </div>
              )}
            </div>
          )}

          {logs.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold">Recent automation logs</h3>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-gray-600">
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
