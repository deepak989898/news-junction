"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Search, Check, X, Link2, ListChecks, Wand2 } from "lucide-react";
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

export default function AiSeoManagerPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<Tool | null>(null);
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
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">SEO Dashboard</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><p className="text-gray-500">Average SEO score</p><p className="font-bold">{String(dashboard?.avgSeoScore || 0)}</p></div>
          <div><p className="text-gray-500">Missing meta</p><p className="font-bold">{String(dashboard?.missingMeta || 0)}</p></div>
          <div><p className="text-gray-500">Missing image ALT</p><p className="font-bold">{String(dashboard?.missingAlt || 0)}</p></div>
          <div><p className="text-gray-500">Thin content</p><p className="font-bold">{String(dashboard?.thinContent || 0)}</p></div>
          <div><p className="text-gray-500">No internal links</p><p className="font-bold">{String(dashboard?.missingInternalLinks || 0)}</p></div>
          <div><p className="text-gray-500">Duplicate titles</p><p className="font-bold">{String(dashboard?.duplicateTitles || 0)}</p></div>
          <div><p className="text-gray-500">Pending SEO suggestions</p><p className="font-bold">{String(dashboard?.pendingSeoSuggestions || 0)}</p></div>
          <div><p className="text-gray-500">Google News checklist</p><p className="font-bold">{Array.isArray(dashboard?.googleNewsReadinessChecklist) ? "Ready" : "Needs review"}</p></div>
        </div>
      </div>

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

        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">SEO Tools</h3>
          <div className="grid gap-2 md:grid-cols-3">
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("audit")} disabled={running === "audit"}><ListChecks className="mr-1 inline h-4 w-4" />Run SEO Audit</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("keywords")} disabled={running === "keywords"}><Sparkles className="mr-1 inline h-4 w-4" />Generate Keywords</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("meta")} disabled={running === "meta"}><Wand2 className="mr-1 inline h-4 w-4" />Generate Meta</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("slug")} disabled={running === "slug"}>Optimize Slug</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("internal")} disabled={running === "internal"}><Link2 className="mr-1 inline h-4 w-4" />Internal Links</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runTool("faq")} disabled={running === "faq"}>Generate FAQ</button>
          </div>
          <button className="mt-3 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={runContentGap}>Run Content Gap Finder</button>
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
