"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ListChecks,
  Play,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  applyEditorialReviewApi,
  getEditorialDashboardApi,
  processEditorialQueueApi,
  reviewDuplicateApi,
  reviewEntitiesApi,
  reviewHeadlineApi,
  reviewImageApi,
  reviewLanguageApi,
  reviewSeoApi,
  reviewSummaryApi,
  runEditorialReviewApi,
  updateEditorialSettingsApi,
} from "@/lib/ai-editorial/client-api";
import { EditorialReviewResult, EditorialSettings } from "@/lib/ai-editorial/types";
import toast from "react-hot-toast";

export default function EditorialManagerPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<EditorialReviewResult | null>(null);
  const [reviewId, setReviewId] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<Partial<EditorialSettings>>({});
  const [beforeAfter, setBeforeAfter] = useState({ titleEn: "", summaryEn: "" });

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedId) || null,
    [articles, selectedId]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return articles.slice(0, 120);
    return articles
      .filter((a) => `${a.titleHi} ${a.titleEn} ${a.slug}`.toLowerCase().includes(term))
      .slice(0, 120);
  }, [articles, search]);

  const refresh = async () => {
    const [news, dash] = await Promise.all([getAllNewsForAdmin(), getEditorialDashboardApi()]);
    setArticles(news);
    setDashboard(dash as Record<string, unknown>);
    setSettingsDraft(((dash as Record<string, unknown>).settings as EditorialSettings) || {});
    if (!selectedId && news.length) setSelectedId(news[0].id);
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load editorial manager");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedArticle) return;
    setBeforeAfter({
      titleEn: selectedArticle.titleEn || "",
      summaryEn: selectedArticle.summaryEn || "",
    });
  }, [selectedArticle]);

  const handleResult = (res: Record<string, unknown>) => {
    if (res.queued) {
      toast.success("Review queued. Process queue to complete.");
      return;
    }
    setReviewId(String(res.reviewId || ""));
    setResult((res.result as EditorialReviewResult) || null);
    if ((res.result as EditorialReviewResult)?.improvedSummary) {
      setBeforeAfter((p) => ({
        ...p,
        summaryEn: (res.result as EditorialReviewResult).improvedSummary || p.summaryEn,
      }));
    }
  };

  const runFull = async (asyncMode = false) => {
    if (!selectedId) return toast.error("Select an article");
    setRunning(true);
    try {
      const res = (await runEditorialReviewApi({
        articleId: selectedId,
        reviewType: "full",
        async: asyncMode,
        force: true,
      })) as Record<string, unknown>;
      handleResult(res);
      await refresh();
      if (!res.queued) toast.success("Editorial review completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    } finally {
      setRunning(false);
    }
  };

  const runPartial = async (type: string) => {
    if (!selectedId) return toast.error("Select an article");
    setRunning(true);
    try {
      const payload = { articleId: selectedId, force: true };
      let res: Record<string, unknown>;
      if (type === "headline") res = (await reviewHeadlineApi(payload)) as Record<string, unknown>;
      else if (type === "summary") res = (await reviewSummaryApi(payload)) as Record<string, unknown>;
      else if (type === "language") res = (await reviewLanguageApi(payload)) as Record<string, unknown>;
      else if (type === "seo") res = (await reviewSeoApi(payload)) as Record<string, unknown>;
      else if (type === "entities") res = (await reviewEntitiesApi(payload)) as Record<string, unknown>;
      else if (type === "image") res = (await reviewImageApi(payload)) as Record<string, unknown>;
      else res = (await reviewDuplicateApi(payload)) as Record<string, unknown>;
      handleResult(res);
      await refresh();
      toast.success(`${type} review completed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Partial review failed");
    } finally {
      setRunning(false);
    }
  };

  const applyAction = async (action: "approve" | "reject" | "apply_suggestions") => {
    if (!selectedId) return;
    try {
      await applyEditorialReviewApi({
        articleId: selectedId,
        reviewId: reviewId || undefined,
        action,
        payload:
          action === "apply_suggestions"
            ? {
                titleEn: beforeAfter.titleEn,
                summaryEn: beforeAfter.summaryEn,
                tags: [
                  ...(result?.suggestedTagsEn || []),
                  ...(selectedArticle?.tags || []),
                ].filter((v, i, arr) => arr.indexOf(v) === i),
              }
            : undefined,
      });
      toast.success(`Review ${action} successful`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const saveSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can update thresholds");
    await updateEditorialSettingsApi(settingsDraft as Record<string, unknown>);
    toast.success("Editorial settings updated");
    await refresh();
  };

  const processQueue = async () => {
    await processEditorialQueueApi({ limit: 10 });
    toast.success("Queue processing triggered");
    await refresh();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const scores = result?.scores;
  const reviews = (dashboard?.reviews as Record<string, unknown>[]) || [];
  const logs = (dashboard?.logs as Record<string, unknown>[]) || [];
  const queue = (dashboard?.queue as Record<string, unknown>[]) || [];

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Editorial Manager"
        actions={<span className="text-sm text-gray-500">Quality, consistency & pre-publish review</span>}
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        Editorial findings are suggestions only. Possible inconsistencies may require human review. This system does not determine truth or falsehood.
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Average quality score</p><p className="text-2xl font-bold">{String(dashboard?.avgQualityScore || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Below threshold</p><p className="text-2xl font-bold">{String(dashboard?.belowThreshold || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Waiting review</p><p className="text-2xl font-bold">{String(dashboard?.waitingReview || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Duplicate warnings</p><p className="text-2xl font-bold">{String(dashboard?.duplicateWarnings || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">SEO issues</p><p className="text-2xl font-bold">{String(dashboard?.seoIssues || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Image issues</p><p className="text-2xl font-bold">{String(dashboard?.imageIssues || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Translation issues</p><p className="text-2xl font-bold">{String(dashboard?.translationIssues || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Headline issues</p><p className="text-2xl font-bold">{String(dashboard?.headlineIssues || 0)}</p></div>
      </div>

      {adminUser?.role === "super_admin" && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Approval / Threshold Settings</h3>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label>Minimum publish score
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.minimumPublishScore || 70)} onChange={(e) => setSettingsDraft((p) => ({ ...p, minimumPublishScore: Number(e.target.value) }))} />
            </label>
            <label>Quality threshold
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.qualityThreshold || 65)} onChange={(e) => setSettingsDraft((p) => ({ ...p, qualityThreshold: Number(e.target.value) }))} />
            </label>
            <label>Duplicate threshold
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.duplicateThreshold || 70)} onChange={(e) => setSettingsDraft((p) => ({ ...p, duplicateThreshold: Number(e.target.value) }))} />
            </label>
            <label>Cache minutes
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.cacheMinutes || 30)} onChange={(e) => setSettingsDraft((p) => ({ ...p, cacheMinutes: Number(e.target.value) }))} />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settingsDraft.queueEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, queueEnabled: e.target.checked }))} /> Queue enabled</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settingsDraft.allowAutoPublishAboveScore)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowAutoPublishAboveScore: e.target.checked }))} /> Allow auto-publish above score</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settingsDraft.requireHumanReviewForHighRisk)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireHumanReviewForHighRisk: e.target.checked }))} /> Require human review for high-risk</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settingsDraft.allowEditorsToApprove)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowEditorsToApprove: e.target.checked }))} /> Allow editors to approve</label>
          </div>
          <button className="mt-3 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">Article Selector</h3>
          <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Search title/slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="w-full rounded border p-2 text-sm" size={10} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {filtered.map((a) => (
              <option key={a.id} value={a.id}>[{a.status}] {a.titleEn || a.titleHi}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Review Pipeline</h3>
          <div className="flex flex-wrap gap-2">
            <button className="rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" disabled={running} onClick={() => runFull(false)}>
              <ShieldCheck className="mr-1 inline h-4 w-4" />{running ? "Reviewing..." : "Run Full Review"}
            </button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runFull(true)}><Play className="mr-1 inline h-4 w-4" />Queue Review</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={processQueue}><RefreshCw className="mr-1 inline h-4 w-4" />Process Queue</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("headline")}>Headline</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("summary")}>Summary</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("language")}>Language</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("seo")}>SEO</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("entities")}>Entities</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("image")}>Image</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runPartial("duplicate")}>Duplicate</button>
          </div>

          {scores && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="rounded border p-2"><strong>Overall:</strong> {scores.overall}</div>
              <div className="rounded border p-2"><strong>Readability:</strong> {scores.readability}</div>
              <div className="rounded border p-2"><strong>SEO:</strong> {scores.seo}</div>
              <div className="rounded border p-2"><strong>Language:</strong> {scores.languageQuality}</div>
              <div className="rounded border p-2"><strong>Duplicate Risk:</strong> {scores.duplicateRisk}</div>
              <div className="rounded border p-2"><strong>Source Consistency:</strong> {scores.sourceConsistency}</div>
              <div className="rounded border p-2"><strong>Translation:</strong> {scores.translationQuality}</div>
              <div className="rounded border p-2"><strong>Headline:</strong> {scores.headlineQuality}</div>
              <div className="rounded border p-2"><strong>Summary:</strong> {scores.summaryQuality}</div>
            </div>
          )}

          {result && (
            <p className="mt-3 text-sm text-gray-600">
              Source consistency label: <strong>{result.sourceConsistencyLabel}</strong> · Duplicate ~{result.duplicatePercent}%
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Issues</h3>
          <ul className="space-y-2 text-sm">
            {(result?.issues || []).map((issue, idx) => (
              <li key={idx} className="rounded border p-2">
                <span className="font-medium uppercase text-xs text-gray-500">{issue.severity}</span>
                <p>{issue.message}</p>
              </li>
            ))}
            {!result?.issues?.length && <li className="text-gray-500">No issues yet. Run a review.</li>}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Suggestions</h3>
          <ul className="space-y-2 text-sm">
            {(result?.suggestions || []).map((s, idx) => (
              <li key={idx} className="rounded border p-2">{s.message}</li>
            ))}
            {!result?.suggestions?.length && <li className="text-gray-500">No suggestions yet.</li>}
          </ul>
          {(result?.alternativeHeadlines || []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500">Alternative headlines</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {result?.alternativeHeadlines.map((h, i) => (
                  <li key={i}>
                    <button className="text-left text-[#c41e20] hover:underline" onClick={() => setBeforeAfter((p) => ({ ...p, titleEn: h }))}>{h}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Before / After Comparison</h3>
          <div className="grid gap-3 text-sm">
            <div>
              <p className="mb-1 text-xs text-gray-500">Current headline</p>
              <div className="rounded border bg-gray-50 p-2">{selectedArticle?.titleEn || selectedArticle?.titleHi || "—"}</div>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Suggested / editable headline</p>
              <textarea className="w-full rounded border p-2" rows={2} value={beforeAfter.titleEn} onChange={(e) => setBeforeAfter((p) => ({ ...p, titleEn: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Current summary</p>
              <div className="rounded border bg-gray-50 p-2">{selectedArticle?.summaryEn || selectedArticle?.summaryHi || "—"}</div>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Suggested / editable summary</p>
              <textarea className="w-full rounded border p-2" rows={4} value={beforeAfter.summaryEn} onChange={(e) => setBeforeAfter((p) => ({ ...p, summaryEn: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded bg-green-700 px-3 py-2 text-sm font-bold text-white" onClick={() => applyAction("approve")}><Check className="mr-1 inline h-4 w-4" />Approve</button>
            <button className="rounded border px-3 py-2 text-sm text-red-700" onClick={() => applyAction("reject")}><X className="mr-1 inline h-4 w-4" />Reject</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => applyAction("apply_suggestions")}><Sparkles className="mr-1 inline h-4 w-4" />Apply Suggestions</button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Entity Review & Checklist</h3>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(result?.entities || []).slice(0, 24).map((e, i) => (
              <span key={i} className="rounded-full border px-2 py-1">{e.type}: {e.value}</span>
            ))}
            {!result?.entities?.length && <span className="text-sm text-gray-500">No entities extracted yet.</span>}
          </div>
          <div className="space-y-1 text-sm">
            {result?.checklist && Object.entries(result.checklist).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded border px-2 py-1">
                <span>{k}</span>
                <span className={v ? "text-green-700" : "text-amber-700"}>{v ? "Yes" : "No"}</span>
              </div>
            ))}
          </div>
          {(result?.duplicateMatches || []).length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">Duplicate warnings</p>
              {result?.duplicateMatches.map((d) => (
                <p key={d.articleId} className="text-sm text-red-700">{d.title} · {d.similarity}% · {d.reason}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]"><ListChecks className="mr-1 inline h-4 w-4" />Review History</h3>
          <div className="max-h-72 overflow-auto text-sm">
            {reviews.slice(0, 30).map((r) => (
              <div key={String(r.id)} className="mb-2 rounded border p-2">
                <p className="font-medium">{String(r.reviewType)} · score {String(r.reviewScore)} · {String(r.status)}</p>
                <p className="text-xs text-gray-500">{String(r.articleId)} · {String(r.createdAt || "")}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Queue & Logs</h3>
          <div className="mb-3 max-h-36 overflow-auto text-sm">
            {queue.slice(0, 15).map((q) => (
              <div key={String(q.id)} className="mb-1 rounded border p-2">{String(q.articleId)} · {String(q.status)} · retries {String(q.retryCount || 0)}</div>
            ))}
            {!queue.length && <p className="text-gray-500">Queue empty</p>}
          </div>
          <div className="max-h-36 overflow-auto text-sm">
            {logs.slice(0, 20).map((l) => (
              <div key={String(l.id)} className="mb-1 rounded border p-2">
                <p className="font-medium">{String(l.actionType)} · {String(l.status)}</p>
                <p className="text-xs text-gray-500">{String(l.message)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
