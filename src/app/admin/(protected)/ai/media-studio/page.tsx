"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Play, Check, X, RefreshCw, Download, Save, ShieldAlert } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  applyMediaApi,
  enqueueMediaApi,
  generateMediaApi,
  getMediaStudioApi,
  processQueueApi,
  updateQueueStatusApi,
  updateBrandKitApi,
  updateMediaSettingsApi,
} from "@/lib/ai-media/client-api";
import toast from "react-hot-toast";

const IMAGE_TYPES = [
  "article_featured",
  "breaking_news",
  "category_banner",
  "homepage_hero",
  "trending_banner",
  "editors_pick_banner",
  "open_graph",
  "twitter_card",
  "youtube_thumbnail",
  "newsletter_banner",
  "push_banner",
  "mobile_banner",
  "desktop_banner",
];

const STYLES = [
  "modern", "editorial", "minimal", "newspaper", "magazine", "corporate", "technology", "sports", "business",
  "finance", "health", "entertainment", "travel", "education", "neutral_illustration", "flat_design", "3d_illustration", "photorealistic", "clean_infographic"
];

export default function AiMediaStudioPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [search, setSearch] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [imageType, setImageType] = useState("article_featured");
  const [style, setStyle] = useState("editorial");
  const [language, setLanguage] = useState<"hi" | "en" | "both">("both");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [studio, setStudio] = useState<Record<string, unknown> | null>(null);
  const [bulkCount, setBulkCount] = useState(10);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});
  const [brandDraft, setBrandDraft] = useState<Record<string, unknown>>({});

  const filteredNews = useMemo(() => {
    const q = search.toLowerCase();
    return news.filter((n) => `${n.titleHi} ${n.titleEn} ${n.slug}`.toLowerCase().includes(q)).slice(0, 150);
  }, [news, search]);

  const load = async () => {
    const [newsData, studioData] = await Promise.all([getAllNewsForAdmin(), getMediaStudioApi()]);
    setNews(newsData);
    setStudio(studioData as Record<string, unknown>);
    const settings = (studioData as Record<string, unknown>).settings as Record<string, unknown>;
    const brandKit = (studioData as Record<string, unknown>).brandKit as Record<string, unknown>;
    setSettingsDraft(settings || {});
    setBrandDraft(brandKit || {});
    if (!selectedArticleId && newsData.length) setSelectedArticleId(newsData[0].id);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load media studio");
      setLoading(false);
    });
  }, []);

  const selectedArticle = useMemo(
    () => news.find((n) => n.id === selectedArticleId) || null,
    [news, selectedArticleId]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const alternatives = imageType === "article_featured" ? 4 : 1;
      await generateMediaApi({
        articleId: selectedArticleId || undefined,
        imageType,
        style,
        language,
        customPrompt: customPrompt || undefined,
        alternatives,
      });
      toast.success("Images generated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleEnqueueBulk = async () => {
    const ids = filteredNews.slice(0, bulkCount).map((n) => n.id);
    if (!ids.length) {
      toast.error("No articles selected for queue");
      return;
    }
    await enqueueMediaApi({
      articleIds: ids,
      imageType,
      style,
      language,
      customPrompt: customPrompt || undefined,
    });
    toast.success(`${ids.length} items queued`);
    await load();
  };

  const handleProcessQueue = async () => {
    await processQueueApi({ limit: 20 });
    toast.success("Queue processed");
    await load();
  };

  const handleQueueStatus = async (id: string, status: string) => {
    await updateQueueStatusApi({ id, status });
    await load();
  };

  const handleApplyAsset = async (imageId: string, action: "approve" | "reject" | "apply") => {
    await applyMediaApi({
      imageId,
      articleId: selectedArticleId || undefined,
      action,
    });
    toast.success(`Asset ${action}d`);
    await load();
  };

  const saveMediaSettings = async () => {
    await updateMediaSettingsApi(settingsDraft);
    toast.success("Media settings updated");
    await load();
  };

  const saveBrandKit = async () => {
    await updateBrandKitApi(brandDraft);
    toast.success("Brand kit updated");
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const usage = (studio?.usage || {}) as Record<string, unknown>;
  const analytics = (studio?.analytics || {}) as Record<string, unknown>;
  const assets = ((studio?.assets as Record<string, unknown>[]) || []).filter((a) =>
    selectedArticleId ? a.articleId === selectedArticleId : true
  );
  const queue = (studio?.queue as Record<string, unknown>[]) || [];
  const logs = (studio?.logs as Record<string, unknown>[]) || [];

  return (
    <RoleGuard>
      <AdminTopbar title="AI Media Studio" actions={<span className="text-sm text-gray-500">Images, graphics and visual assets</span>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Today's image count</p><p className="text-2xl font-bold">{String(usage.dailyImages || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Monthly image cost</p><p className="text-2xl font-bold">${Number(usage.monthlyCost || 0).toFixed(2)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Average cost / image</p><p className="text-2xl font-bold">${Number(usage.avgCostPerImage || 0).toFixed(3)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Failed generations</p><p className="text-2xl font-bold">{String(usage.failedGenerations || 0)}</p></div>
      </div>

      {Boolean(usage.limitExceeded) && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ShieldAlert className="mr-2 inline h-4 w-4" /> Media generation paused due to daily/monthly/cost limits.
        </div>
      )}

      {adminUser?.role === "super_admin" && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-[#1a2b4c]">Provider & Cost Settings</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Default Provider
                <select className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.defaultProvider || "openai-images")} onChange={(e) => setSettingsDraft((p) => ({ ...p, defaultProvider: e.target.value }))}>
                  <option value="openai-images">OpenAI Images</option>
                  <option value="google-gemini-image">Google Gemini Image (gemini-3.1-flash-image)</option>
                  <option value="stability-ai">Stability AI (not configured)</option>
                </select>
              </label>
              <label className="text-sm">Default Image Size
                <select className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.defaultImageSize || "1536x1024")} onChange={(e) => setSettingsDraft((p) => ({ ...p, defaultImageSize: e.target.value }))}>
                  <option value="1024x1024">1024x1024</option>
                  <option value="1536x1024">1536x1024</option>
                  <option value="1024x1536">1024x1536</option>
                  <option value="1792x1024">1792x1024</option>
                  <option value="1024x1792">1024x1792</option>
                </select>
              </label>
              <label className="text-sm">Daily image limit
                <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.dailyImageLimit || 200)} onChange={(e) => setSettingsDraft((p) => ({ ...p, dailyImageLimit: Number(e.target.value) }))} />
              </label>
              <label className="text-sm">Monthly image limit
                <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.monthlyImageLimit || 3000)} onChange={(e) => setSettingsDraft((p) => ({ ...p, monthlyImageLimit: Number(e.target.value) }))} />
              </label>
              <label className="text-sm">Max monthly cost ($)
                <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.maxImageCost || 300)} onChange={(e) => setSettingsDraft((p) => ({ ...p, maxImageCost: Number(e.target.value) }))} />
              </label>
              <label className="text-sm">Default style
                <select className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.defaultStyle || "editorial")} onChange={(e) => setSettingsDraft((p) => ({ ...p, defaultStyle: e.target.value }))}>
                  {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <label><input type="checkbox" checked={Boolean(settingsDraft.requireApproval)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApproval: e.target.checked }))} /> Require approval</label>
              <label><input type="checkbox" checked={Boolean(settingsDraft.watermarkEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, watermarkEnabled: e.target.checked }))} /> Watermark enabled</label>
              <label><input type="checkbox" checked={Boolean(settingsDraft.autoCompress)} onChange={(e) => setSettingsDraft((p) => ({ ...p, autoCompress: e.target.checked }))} /> Auto compress</label>
              <label><input type="checkbox" checked={Boolean(settingsDraft.autoWebP)} onChange={(e) => setSettingsDraft((p) => ({ ...p, autoWebP: e.target.checked }))} /> Auto WebP</label>
            </div>
            <button className="mt-4 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveMediaSettings}>Save Settings</button>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-[#1a2b4c]">Brand Kit</h3>
            <div className="grid gap-3">
              <label className="text-sm">Logo URL<input className="mt-1 w-full rounded border px-2 py-1" value={String(brandDraft.logoUrl || "")} onChange={(e) => setBrandDraft((p) => ({ ...p, logoUrl: e.target.value }))} /></label>
              <label className="text-sm">Primary colors (comma-separated)<input className="mt-1 w-full rounded border px-2 py-1" value={Array.isArray(brandDraft.primaryColors) ? (brandDraft.primaryColors as string[]).join(", ") : ""} onChange={(e) => setBrandDraft((p) => ({ ...p, primaryColors: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} /></label>
              <label className="text-sm">Typography<input className="mt-1 w-full rounded border px-2 py-1" value={String(brandDraft.typography || "")} onChange={(e) => setBrandDraft((p) => ({ ...p, typography: e.target.value }))} /></label>
              <label className="text-sm">Brand style<input className="mt-1 w-full rounded border px-2 py-1" value={String(brandDraft.brandStyle || "")} onChange={(e) => setBrandDraft((p) => ({ ...p, brandStyle: e.target.value }))} /></label>
            </div>
            <button className="mt-4 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveBrandKit}>Save Brand Kit</button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Article Select</h3>
          <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Search title or slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="w-full rounded border p-2 text-sm" value={selectedArticleId} onChange={(e) => setSelectedArticleId(e.target.value)} size={8}>
            {filteredNews.map((n) => <option key={n.id} value={n.id}>{n.titleEn || n.titleHi}</option>)}
          </select>
          {selectedArticle && <p className="mt-2 text-xs text-gray-500">Selected: {selectedArticle.titleEn || selectedArticle.titleHi}</p>}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Generate Image Assets</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">Image Type<select className="mt-1 w-full rounded border px-2 py-1" value={imageType} onChange={(e) => setImageType(e.target.value)}>{IMAGE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="text-sm">Style<select className="mt-1 w-full rounded border px-2 py-1" value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="text-sm">Language<select className="mt-1 w-full rounded border px-2 py-1" value={language} onChange={(e) => setLanguage(e.target.value as "hi" | "en" | "both")}><option value="both">both</option><option value="hi">hi</option><option value="en">en</option></select></label>
          </div>
          <textarea className="mt-3 w-full rounded border px-3 py-2 text-sm" rows={3} placeholder="Custom instruction (optional)" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" disabled={generating} onClick={handleGenerate}><ImagePlus className="mr-1 inline h-4 w-4" />{generating ? "Generating..." : "Generate"}</button>
            <button className="rounded border px-4 py-2 text-sm" onClick={handleEnqueueBulk}><Save className="mr-1 inline h-4 w-4" />Queue Bulk</button>
            <button className="rounded border px-4 py-2 text-sm" onClick={handleProcessQueue}><Play className="mr-1 inline h-4 w-4" />Process Queue</button>
            <label className="text-sm">Bulk Count
              <select className="ml-2 rounded border px-2 py-1" value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Generated Assets (with version history)</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={String(a.id || a.imageId)} className="rounded border p-3">
              <img src={String(a.thumbnailUrl || a.imageUrl)} alt={String(a.imageType)} className="h-36 w-full rounded object-cover" />
              <p className="mt-2 text-xs text-gray-500">{String(a.imageType)} · {String(a.style)} · v{String(a.version || 1)}</p>
              <p className="text-xs">Status: <strong>{String(a.status)}</strong></p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button className="rounded border px-2 py-1" onClick={() => handleApplyAsset(String(a.imageId || a.id), "approve")}><Check className="mr-1 inline h-3 w-3" />Approve</button>
                <button className="rounded border px-2 py-1" onClick={() => handleApplyAsset(String(a.imageId || a.id), "reject")}><X className="mr-1 inline h-3 w-3" />Reject</button>
                <button className="rounded border px-2 py-1" onClick={() => handleApplyAsset(String(a.imageId || a.id), "apply")}><Save className="mr-1 inline h-3 w-3" />Set Featured</button>
                <a className="rounded border px-2 py-1" href={String(a.imageUrl)} target="_blank" rel="noopener noreferrer"><Download className="mr-1 inline h-3 w-3" />Download</a>
                <button className="rounded border px-2 py-1" onClick={handleGenerate}><RefreshCw className="mr-1 inline h-3 w-3" />Regenerate</button>
              </div>
            </div>
          ))}
          {!assets.length && <p className="text-sm text-gray-500">No assets generated for selected article yet.</p>}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Media Generation Queue</h3>
          <div className="max-h-80 overflow-auto">
            {queue.map((q) => (
              <div key={String(q.id)} className="mb-2 rounded border p-2 text-sm">
                <p className="font-medium">{String(q.imageType)} · {String(q.status)}</p>
                <p className="text-xs text-gray-500">Article: {String(q.articleId || "-")} · Retry: {String(q.retryCount || 0)}</p>
                <div className="mt-1 flex gap-2 text-xs">
                  <button className="rounded border px-2 py-1" onClick={() => handleQueueStatus(String(q.id), "cancelled")}>Cancel</button>
                  <button className="rounded border px-2 py-1" onClick={() => handleQueueStatus(String(q.id), "retrying")}>Retry</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI Media Logs</h3>
          <div className="max-h-80 overflow-auto">
            {logs.map((l) => (
              <div key={String(l.id)} className="mb-2 rounded border p-2 text-sm">
                <p className="font-medium">{String(l.actionType)}</p>
                <p className="text-xs text-gray-500">Provider: {String(l.provider)} · Cost: ${Number(l.estimatedCost || 0).toFixed(2)} · Images: {String(l.imagesGenerated || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Media Analytics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p><strong>Most used style:</strong> {String(analytics.mostUsedStyle || "-")}</p>
          <p><strong>Success rate:</strong> {(Number(analytics.generationSuccessRate || 0) * 100).toFixed(1)}%</p>
          <p><strong>Approval rate:</strong> {(Number(analytics.approvalRate || 0) * 100).toFixed(1)}%</p>
          <p><strong>Storage usage:</strong> {(Number(analytics.storageUsageBytes || 0) / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      </div>
    </RoleGuard>
  );
}
