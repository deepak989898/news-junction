"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, Check, X, Link2, ListChecks, Wand2, AlertTriangle, ExternalLink, ArrowRight } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import {
  applySeoChangesApi,
  getSeoDashboardApi,
  getSeoSettingsApi,
  runSeoAuditApi,
  runSeoContentGapApi,
  runSeoFaqApi,
  runSeoInternalLinksApi,
  runSeoKeywordsApi,
  runSeoMetaApi,
  runSeoSlugApi,
  updateSeoSettingsApi,
} from "@/lib/ai-seo/client-api";
import { SeoAiSettings } from "@/lib/ai-seo/types";
import toast from "react-hot-toast";

type Tool = "audit" | "keywords" | "meta" | "slug" | "internal" | "faq";

type ArticleRef = { id: string; titleHi: string; titleEn: string; slug: string };

type IssueKey =
  | "missingMeta"
  | "missingInternalLinks"
  | "thinContent"
  | "missingAlt"
  | "duplicateTitles"
  | "pendingSeoSuggestions";

/** How each clickable dashboard metric maps to an action target. */
const ISSUE_CONFIG: Record<
  IssueKey,
  { label: string; listKey?: string; suggestTool?: Tool; canBackfill?: boolean; howto: string }
> = {
  missingMeta: {
    label: "Missing meta",
    listKey: "missingMetaArticles",
    suggestTool: "meta",
    canBackfill: true,
    howto: "इन articles में SEO meta नहीं है। नीचे किसी article पर 'SEO tools' दबाकर Generate Meta → Apply करें, या ऊपर 'Backfill' से एक साथ auto-fix करें।",
  },
  missingInternalLinks: {
    label: "No internal links",
    listKey: "missingInternalLinksArticles",
    suggestTool: "internal",
    canBackfill: true,
    howto: "इन articles में internal links नहीं हैं। 'Backfill' से auto-fix करें, या हर article पर Internal Links tool चलाकर Approve + Apply करें।",
  },
  thinContent: {
    label: "Thin content",
    listKey: "thinContentArticles",
    howto: "इन articles का content 1200 characters से कम है। 'Open editor' दबाकर content बढ़ाएँ।",
  },
  missingAlt: {
    label: "Missing image ALT",
    listKey: "missingAltArticles",
    howto: "इन articles में image ALT text (हिन्दी + English) नहीं है। 'Open editor' दबाकर ALT भरें।",
  },
  duplicateTitles: {
    label: "Duplicate titles",
    listKey: "duplicateTitleArticles",
    howto: "इन articles के titles एक जैसे हैं। 'Open editor' दबाकर हर title को unique बनाएँ।",
  },
  pendingSeoSuggestions: {
    label: "Pending SEO suggestions",
    howto: "AI द्वारा सुझाए गए internal links और topics नीचे हैं — इन्हें Approve/Reject करें।",
  },
};

export default function AiSeoManagerPage() {
  const { adminUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<Tool>("audit");
  const [settings, setSettings] = useState<SeoAiSettings | null>(null);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Record<string, unknown> | null>(null);
  const [keywords, setKeywords] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [slug, setSlug] = useState<Record<string, unknown> | null>(null);
  const [faq, setFaq] = useState<Record<string, unknown>[] | null>(null);
  const [links, setLinks] = useState<Record<string, unknown>[] | null>(null);
  const [gap, setGap] = useState<Record<string, unknown>[] | null>(null);
  const [activeIssue, setActiveIssue] = useState<IssueKey | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedId) || null,
    [articles, selectedId]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return articles.slice(0, 100);
    return articles.filter((a) => `${a.titleHi} ${a.titleEn} ${a.slug}`.toLowerCase().includes(term)).slice(0, 100);
  }, [articles, search]);

  const refreshAll = async () => {
    const [news, seoSettings, seoDashboard] = await Promise.all([
      getAllNewsForAdmin(),
      getSeoSettingsApi(),
      getSeoDashboardApi(),
    ]);
    setArticles(news);
    setSettings(seoSettings as SeoAiSettings);
    setDashboard(seoDashboard as Record<string, unknown>);
    if (!selectedId && news.length) setSelectedId(news[0].id);
  };

  useEffect(() => {
    (async () => {
      await refreshAll();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load SEO manager");
      setLoading(false);
    });
  }, []);

  const runTool = async (tool: Tool) => {
    if (!selectedId && tool !== "internal") {
      toast.error("Select an article first");
      return;
    }
    setRunning(tool);
    try {
      if (tool === "audit") setAudit((await runSeoAuditApi(selectedId)) as Record<string, unknown>);
      if (tool === "keywords") setKeywords(((await runSeoKeywordsApi(selectedId)) as { result: Record<string, unknown> }).result);
      if (tool === "meta") setMeta(((await runSeoMetaApi(selectedId)) as { result: Record<string, unknown> }).result);
      if (tool === "slug") setSlug(((await runSeoSlugApi(selectedId)) as { result: Record<string, unknown> }).result);
      if (tool === "internal") setLinks((((await runSeoInternalLinksApi(selectedId)) as { suggestions: Record<string, unknown>[] }).suggestions) || []);
      if (tool === "faq") setFaq((((await runSeoFaqApi(selectedId)) as { result: Record<string, unknown>[] }).result) || []);
      await refreshAll();
      toast.success("SEO action completed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "SEO action failed");
    } finally {
      setRunning(null);
    }
  };

  const runContentGap = async () => {
    try {
      const res = await runSeoContentGapApi();
      setGap((res as { suggestions: Record<string, unknown>[] }).suggestions || []);
      await refreshAll();
      toast.success("Content gap suggestions generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const applyMeta = async () => {
    if (!selectedId || !meta) return;
    await applySeoChangesApi({ articleId: selectedId, changeType: "article_fields", payload: {
      seoTitleHi: meta.seoTitleHi,
      seoTitleEn: meta.seoTitleEn,
      seoDescriptionHi: meta.metaDescriptionHi,
      seoDescriptionEn: meta.metaDescriptionEn,
      seoTitle: meta.seoTitleEn,
      seoDescription: meta.metaDescriptionEn,
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
      twitterTitle: meta.twitterTitle,
      twitterDescription: meta.twitterDescription,
    } });
    toast.success("Meta applied");
    await refreshAll();
  };

  const applySlug = async (field: string) => {
    if (!selectedId || !slug?.[field]) return;
    await applySeoChangesApi({ articleId: selectedId, changeType: "article_fields", payload: { slug: slug[field] } });
    toast.success("Slug applied");
    await refreshAll();
  };

  const applyFaq = async () => {
    if (!selectedId || !faq) return;
    await applySeoChangesApi({ articleId: selectedId, changeType: "article_fields", payload: { seoFaqItems: faq } });
    toast.success("FAQ applied");
    await refreshAll();
  };

  const applyLinksToArticle = async () => {
    if (!selectedId || !links) return;
    const approved = links.filter((x) => x.status === "approved");
    await applySeoChangesApi({ articleId: selectedId, changeType: "apply_internal_links_to_article", payload: { links: approved } });
    toast.success("Internal links applied");
    await refreshAll();
  };

  const reviewSuggestion = async (id: string, kind: "link" | "topic", status: "approved" | "rejected" | "applied") => {
    await applySeoChangesApi({
      changeType: kind === "link" ? "internal_link_status" : "topic_status",
      payload: { id, status },
    });
    toast.success(`Suggestion ${status}`);
    await refreshAll();
  };

  const runBulk = async () => {
    if (!selectedBulkIds.length) {
      toast.error("Select articles for bulk action");
      return;
    }
    for (const id of selectedBulkIds) {
      if (bulkAction === "audit") await runSeoAuditApi(id);
      if (bulkAction === "meta") await runSeoMetaApi(id);
      if (bulkAction === "faq") await runSeoFaqApi(id);
      if (bulkAction === "internal") await runSeoInternalLinksApi(id);
      if (bulkAction === "slug") await runSeoSlugApi(id);
      if (bulkAction === "keywords") await runSeoKeywordsApi(id);
    }
    toast.success("Bulk SEO action completed");
    await refreshAll();
  };

  const updateSetting = async (patch: Partial<SeoAiSettings>) => {
    if (adminUser?.role !== "super_admin") return;
    const next = await updateSeoSettingsApi(patch as Record<string, unknown>);
    setSettings(next as SeoAiSettings);
    toast.success("SEO AI settings updated");
  };

  const issueArticles = (key: IssueKey): ArticleRef[] => {
    const listKey = ISSUE_CONFIG[key].listKey;
    if (!listKey) return [];
    return ((dashboard?.[listKey] as ArticleRef[]) || []) as ArticleRef[];
  };

  const openIssue = (key: IssueKey) => {
    setActiveIssue(key);
    setTimeout(() => actionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const focusArticleInTools = (id: string) => {
    setSelectedId(id);
    setTimeout(() => toolsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  const runBackfill = async () => {
    setBackfilling(true);
    setRunning("backfill");
    try {
      const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
      const { backfillArticleEnrichmentApi } = await import("@/lib/article-enrichment/client-api");
      const res = (await runWithAdminBusy("Backfilling FAQ + links + meta…", () =>
        backfillArticleEnrichmentApi(40)
      )) as { processed?: number };
      toast.success(`Backfilled ${res.processed ?? 0} articles (FAQ, internal links, meta)`);
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
      setRunning(null);
    }
  };

  const renderIssueCard = (key: IssueKey, label: string, count: number) => {
    const active = activeIssue === key;
    const hasWork = count > 0;
    return (
      <button
        type="button"
        onClick={() => openIssue(key)}
        className={`group flex flex-col items-start rounded-lg border p-3 text-left transition ${
          active
            ? "border-[#c41e20] bg-red-50 ring-1 ring-[#c41e20]"
            : hasWork
            ? "border-amber-300 bg-amber-50 hover:border-[#c41e20] hover:bg-red-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        <span className="text-gray-500">{label}</span>
        <span className={`text-lg font-bold ${hasWork ? "text-[#c41e20]" : "text-green-600"}`}>{count}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#1a2b4c] opacity-70 transition group-hover:opacity-100">
          {hasWork ? "Fix now" : "View"} <ArrowRight className="h-3 w-3" />
        </span>
      </button>
    );
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="AI SEO Manager" actions={<span className="text-sm text-gray-500">AI-powered SEO operations</span>} />

      {adminUser?.role === "super_admin" && settings && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">SEO AI Settings</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">Max actions/day
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={settings.maxSeoActionsPerDay} onChange={(e) => updateSetting({ maxSeoActionsPerDay: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Min SEO score target
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={settings.minSeoScoreTarget} onChange={(e) => updateSetting({ minSeoScoreTarget: Number(e.target.value) })} />
            </label>
            <label className="text-sm">Internal links/article
              <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={settings.internalLinksPerArticle} onChange={(e) => updateSetting({ internalLinksPerArticle: Number(e.target.value) })} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label><input type="checkbox" checked={settings.aiSeoEnabled} onChange={(e) => updateSetting({ aiSeoEnabled: e.target.checked })} /> AI SEO Enabled</label>
            <label><input type="checkbox" checked={settings.autoApplyLowRiskSeo} onChange={(e) => updateSetting({ autoApplyLowRiskSeo: e.target.checked })} /> Auto-apply low risk</label>
            <label><input type="checkbox" checked={settings.requireApprovalForBulkSeo} onChange={(e) => updateSetting({ requireApprovalForBulkSeo: e.target.checked })} /> Require bulk approval</label>
            <label><input type="checkbox" checked={settings.allowEditorSeoApply} onChange={(e) => updateSetting({ allowEditorSeoApply: e.target.checked })} /> Allow editor apply</label>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-[#1a2b4c]">SEO Dashboard</h3>
        <p className="mb-3 text-xs text-gray-500">
          किसी भी highlighted card पर click करें — नीचे उन्हीं articles/suggestions की list खुलेगी जहाँ action चाहिए।
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Average SEO score</p>
            <p className="text-lg font-bold">{String(dashboard?.avgSeoScore || 0)}</p>
          </div>
          {renderIssueCard("missingMeta", "Missing meta", Number(dashboard?.missingMeta || 0))}
          {renderIssueCard("missingAlt", "Missing image ALT", Number(dashboard?.missingAlt || 0))}
          {renderIssueCard("thinContent", "Thin content", Number(dashboard?.thinContent || 0))}
          {renderIssueCard("missingInternalLinks", "No internal links", Number(dashboard?.missingInternalLinks || 0))}
          {renderIssueCard("duplicateTitles", "Duplicate titles", Number(dashboard?.duplicateTitles || 0))}
          {renderIssueCard("pendingSeoSuggestions", "Pending SEO suggestions", Number(dashboard?.pendingSeoSuggestions || 0))}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Google News checklist</p>
            <p className="text-lg font-bold">{Array.isArray(dashboard?.googleNewsReadinessChecklist) ? "Ready" : "Needs review"}</p>
          </div>
        </div>
      </div>

      {activeIssue && (
        <div ref={actionRef} className="mb-6 rounded-xl border-2 border-[#c41e20] bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#c41e20]" />
              <h3 className="font-semibold text-[#1a2b4c]">
                Action needed — {ISSUE_CONFIG[activeIssue].label}
                {activeIssue !== "pendingSeoSuggestions" && ` (${issueArticles(activeIssue).length})`}
              </h3>
            </div>
            <button className="text-sm text-gray-500 hover:text-gray-800" onClick={() => setActiveIssue(null)}>
              <X className="mr-1 inline h-4 w-4" />Close
            </button>
          </div>
          <p className="mb-3 text-sm text-gray-600">{ISSUE_CONFIG[activeIssue].howto}</p>

          {ISSUE_CONFIG[activeIssue].canBackfill && (
            <button
              className="mb-3 rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={backfilling || !!running}
              onClick={runBackfill}
            >
              {backfilling ? "Backfilling…" : "Fix automatically (Backfill up to 40)"}
            </button>
          )}

          {activeIssue === "pendingSeoSuggestions" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1a2b4c]">Internal link suggestions</p>
                <div className="max-h-72 space-y-2 overflow-auto">
                  {(((dashboard?.pendingLinks as Record<string, unknown>[]) || []).length === 0) && (
                    <p className="text-xs text-gray-500">कोई pending internal-link suggestion नहीं।</p>
                  )}
                  {((dashboard?.pendingLinks as Record<string, unknown>[]) || []).map((l) => (
                    <div key={String(l.id)} className="rounded border bg-gray-50 p-2 text-xs">
                      <p className="font-semibold">{String(l.titleEn || l.anchorTextEn || l.id)}</p>
                      <div className="mt-1 flex gap-3">
                        <button className="text-green-600" onClick={() => reviewSuggestion(String(l.id), "link", "approved")}>
                          <Check className="inline h-4 w-4" /> Approve
                        </button>
                        <button className="text-red-600" onClick={() => reviewSuggestion(String(l.id), "link", "rejected")}>
                          <X className="inline h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#1a2b4c]">Topic suggestions</p>
                <div className="max-h-72 space-y-2 overflow-auto">
                  {(((dashboard?.pendingTopics as Record<string, unknown>[]) || []).length === 0) && (
                    <p className="text-xs text-gray-500">कोई pending topic suggestion नहीं।</p>
                  )}
                  {((dashboard?.pendingTopics as Record<string, unknown>[]) || []).map((t) => (
                    <div key={String(t.id)} className="rounded border bg-gray-50 p-2 text-xs">
                      <p className="font-semibold">{String(t.titleEn || t.titleHi || t.id)}</p>
                      {!!t.reason && <p className="text-gray-600">{String(t.reason)}</p>}
                      <div className="mt-1 flex gap-3">
                        <button className="text-green-600" onClick={() => reviewSuggestion(String(t.id), "topic", "approved")}>
                          <Check className="inline h-4 w-4" /> Approve
                        </button>
                        <button className="text-red-600" onClick={() => reviewSuggestion(String(t.id), "topic", "rejected")}>
                          <X className="inline h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : issueArticles(activeIssue).length === 0 ? (
            <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              यहाँ कुछ भी ठीक करने को नहीं है 🎉
            </p>
          ) : (
            <div className="max-h-96 divide-y overflow-auto rounded border">
              {issueArticles(activeIssue).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{a.titleEn || a.titleHi || a.slug || a.id}</span>
                  <div className="flex shrink-0 gap-2">
                    {ISSUE_CONFIG[activeIssue].suggestTool && (
                      <button
                        className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => focusArticleInTools(a.id)}
                      >
                        SEO tools
                      </button>
                    )}
                    <button
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => router.push(`/admin/news/${a.id}/edit`)}
                    >
                      <ExternalLink className="h-3 w-3" /> Open editor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-[#1a2b4c]">Article Search / Select</h3>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded border py-2 pl-8 pr-2 text-sm" placeholder="Search title or slug" />
          </div>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} size={8} className="w-full rounded border p-2 text-sm">
            {filtered.map((a) => <option key={a.id} value={a.id}>[{a.status}] {a.titleEn || a.titleHi}</option>)}
          </select>
          <p className="mt-2 text-xs text-gray-500">Selected: {selectedArticle?.titleEn || selectedArticle?.titleHi || "None"}</p>
        </div>

        <div ref={toolsRef} className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">SEO Tools</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("audit")} disabled={!!running}><ListChecks className="mr-1 inline h-4 w-4" />{running === "audit" ? "Running…" : "Run SEO Audit"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("keywords")} disabled={!!running}><Sparkles className="mr-1 inline h-4 w-4" />{running === "keywords" ? "Generating…" : "Generate Keywords"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("meta")} disabled={!!running}><Wand2 className="mr-1 inline h-4 w-4" />{running === "meta" ? "Generating…" : "Generate Meta"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("slug")} disabled={!!running}>{running === "slug" ? "Optimizing…" : "Optimize Slug"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("internal")} disabled={!!running}><Link2 className="mr-1 inline h-4 w-4" />{running === "internal" ? "Generating…" : "Internal Links"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={() => runTool("faq")} disabled={!!running}>{running === "faq" ? "Generating…" : "Generate FAQ"}</button>
          </div>
          <button className="mt-3 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={!!running} onClick={runContentGap}>Run Content Gap Finder</button>
          <button
            className="mt-3 ml-2 rounded border border-[#c41e20] px-4 py-2 text-sm font-bold text-[#c41e20] disabled:opacity-50"
            disabled={!!running || backfilling}
            onClick={runBackfill}
          >
            {backfilling ? "Backfilling…" : "Backfill FAQ + Internal Links"}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Bulk SEO Tools</h3>
        <div className="mb-2 flex flex-wrap gap-3">
          <select className="rounded border px-2 py-1 text-sm" value={bulkAction} onChange={(e) => setBulkAction(e.target.value as Tool)}>
            <option value="audit">Run SEO audit</option>
            <option value="meta">Generate missing meta</option>
            <option value="faq">Generate FAQ</option>
            <option value="internal">Generate internal links</option>
            <option value="slug">Improve slugs</option>
            <option value="keywords">Generate keywords</option>
          </select>
          <button className="rounded bg-[#c41e20] px-4 py-1.5 text-sm font-bold text-white" onClick={runBulk}>Run Bulk</button>
        </div>
        <div className="max-h-44 overflow-y-auto rounded border p-2 text-sm">
          {filtered.slice(0, 30).map((a) => (
            <label key={a.id} className="block">
              <input
                type="checkbox"
                checked={selectedBulkIds.includes(a.id)}
                onChange={(e) => {
                  setSelectedBulkIds((prev) => e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id));
                }}
              />{" "}
              {a.titleEn || a.titleHi}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">SEO Audit Result</h3>
          <pre className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(audit, null, 2)}</pre>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Keyword Suggestions</h3>
          <pre className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(keywords, null, 2)}</pre>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Meta Preview</h3>
          <pre className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(meta, null, 2)}</pre>
          {meta && <button className="mt-3 rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" onClick={applyMeta}>Apply Meta</button>}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Slug Suggestions</h3>
          <pre className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(slug, null, 2)}</pre>
          {slug && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded border px-3 py-1.5 text-sm" onClick={() => applySlug("englishSlug")}>Apply English Slug</button>
              <button className="rounded border px-3 py-1.5 text-sm" onClick={() => applySlug("shortSeoSlug")}>Apply Short Slug</button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">FAQ Suggestions</h3>
          <pre className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">{JSON.stringify(faq, null, 2)}</pre>
          {faq && <button className="mt-3 rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" onClick={applyFaq}>Apply FAQ</button>}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Internal Link Suggestions</h3>
          <div className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-xs">
            {(links || []).map((l) => (
              <div key={String(l.id || `${l.suggestedArticleId}`)} className="mb-2 rounded border bg-white p-2">
                <p className="font-semibold">{String(l.titleEn || "")}</p>
                <p>Anchor EN: {String(l.anchorTextEn || "")}</p>
                <p>Status: {String(l.status || "pending")}</p>
                <div className="mt-1 flex gap-2">
                  <button className="text-green-600" onClick={() => reviewSuggestion(String(l.id), "link", "approved")}><Check className="inline h-4 w-4" /> Approve</button>
                  <button className="text-red-600" onClick={() => reviewSuggestion(String(l.id), "link", "rejected")}><X className="inline h-4 w-4" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
          {!!links?.length && <button className="mt-3 rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" onClick={applyLinksToArticle}>Apply Approved Links</button>}
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Content Gap Suggestions</h3>
        <div className="space-y-2">
          {(gap || []).map((g, idx) => (
            <div key={String(g.id || idx)} className="rounded border p-2 text-sm">
              <p className="font-semibold">{String(g.titleEn || "")}</p>
              <p className="text-gray-600">{String(g.reason || "")}</p>
              {!!g.id && (
                <div className="mt-1 flex gap-3">
                  <button className="text-green-600" onClick={() => reviewSuggestion(String(g.id), "topic", "approved")}>Approve</button>
                  <button className="text-red-600" onClick={() => reviewSuggestion(String(g.id), "topic", "rejected")}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI SEO Logs</h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-gray-500"><th className="py-2">Time</th><th>Action</th><th>Article</th><th>Cost</th><th>Status</th></tr></thead>
            <tbody>
              {((dashboard?.logs as Record<string, unknown>[]) || []).map((log) => (
                <tr key={String(log.id)} className="border-b">
                  <td className="py-2">{String(log.createdAt || "-")}</td>
                  <td>{String(log.actionType || "-")}</td>
                  <td>{String(log.articleId || "-")}</td>
                  <td>${Number(log.estimatedCost || 0).toFixed(4)}</td>
                  <td>{String(log.status || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
