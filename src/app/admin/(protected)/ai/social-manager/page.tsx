"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Send, Wand2, Layers, BarChart3, AlertTriangle } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import {
  bulkSocialActionApi,
  createCampaignApi,
  generateSocialContentApi,
  getSocialDashboardApi,
  processSocialQueueApi,
  scheduleSocialPostApi,
  updateSocialSettingsApi,
} from "@/lib/ai-social/client-api";
import toast from "react-hot-toast";

const PLATFORMS = ["facebook", "instagram", "x", "linkedin", "telegram"] as const;

export default function AiSocialManagerPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("facebook");
  const [scheduleAt, setScheduleAt] = useState("");
  const [generated, setGenerated] = useState<Record<string, unknown> | null>(null);
  const [editableText, setEditableText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [cta, setCta] = useState("Read full story on News Junction.");
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [campaign, setCampaign] = useState({ name: "", startDate: "", endDate: "", platforms: ["facebook"], categories: [] as string[] });
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});

  const load = async () => {
    const [newsData, dash] = await Promise.all([getAllNewsForAdmin(), getSocialDashboardApi()]);
    setNews(newsData);
    setDashboard(dash as Record<string, unknown>);
    setSettingsDraft((dash as Record<string, unknown>).settings as Record<string, unknown>);
    if (!selectedArticleId && newsData.length) setSelectedArticleId(newsData[0].id);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load social manager");
      setLoading(false);
    });
  }, []);

  const selectedArticle = useMemo(() => news.find((n) => n.id === selectedArticleId) || null, [news, selectedArticleId]);
  const filteredNews = useMemo(() => {
    const q = search.toLowerCase();
    return news.filter((n) => `${n.titleHi} ${n.titleEn} ${n.slug}`.toLowerCase().includes(q)).slice(0, 100);
  }, [news, search]);

  const queue = (dashboard?.queue as Record<string, unknown>[]) || [];
  const campaigns = (dashboard?.campaigns as Record<string, unknown>[]) || [];
  const logs = (dashboard?.logs as Record<string, unknown>[]) || [];
  const stats = (dashboard?.stats as Record<string, unknown>) || {};
  const accounts = (dashboard?.accounts as Record<string, unknown>[]) || [];

  const generate = async (breaking = false) => {
    if (!selectedArticleId) return toast.error("Select an article");
    const res = await generateSocialContentApi({ articleId: selectedArticleId, breaking });
    const content = (res as { content: Record<string, unknown> }).content;
    setGenerated(content);
    const platformMap: Record<string, string> = {
      facebook: String(content.facebookPost || ""),
      instagram: String(content.instagramCaption || ""),
      x: String(content.xPost || ""),
      linkedin: String(content.linkedinPost || ""),
      telegram: String(content.telegramPost || ""),
    };
    setEditableText(platformMap[selectedPlatform] || String(content.englishVersion || ""));
    setHashtags(Array.isArray(content.hashtags) ? (content.hashtags as string[]) : []);
    setCta(String(content.callToAction || "Read full story on News Junction."));
    toast.success("Social copy generated");
  };

  const schedulePost = async (publishNow = false) => {
    if (!selectedArticleId || !selectedPlatform || !editableText) {
      return toast.error("Generate content first");
    }
    await scheduleSocialPostApi({
      articleId: selectedArticleId,
      platform: selectedPlatform,
      text: editableText,
      hashtags,
      cta,
      imageUrl: selectedArticle?.imageUrl || undefined,
      language: "en",
      scheduledAt: publishNow ? undefined : scheduleAt || undefined,
      approvalStatus: publishNow ? "approved" : "pending",
    });
    toast.success(publishNow ? "Post queued for immediate publish" : "Post scheduled");
    await load();
  };

  const processQueue = async () => {
    await processSocialQueueApi({ limit: 30 });
    toast.success("Queue processing triggered");
    await load();
  };

  const runBulkAction = async (action: "publish" | "cancel" | "regenerate_captions" | "regenerate_hashtags") => {
    if (!selectedQueueIds.length) return toast.error("Select queue items");
    await bulkSocialActionApi({ queueIds: selectedQueueIds, action });
    toast.success(`Bulk ${action} completed`);
    await load();
  };

  const saveSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can update settings");
    await updateSocialSettingsApi(settingsDraft);
    toast.success("Social settings updated");
    await load();
  };

  const createCampaign = async () => {
    if (!campaign.name || !campaign.startDate || !campaign.endDate) return toast.error("Fill campaign details");
    await createCampaignApi({
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      platforms: campaign.platforms,
      categories: campaign.categories,
      status: "draft",
    });
    toast.success("Campaign created");
    setCampaign({ name: "", startDate: "", endDate: "", platforms: ["facebook"], categories: [] });
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="AI Social Manager" actions={<span className="text-sm text-gray-500">Content distribution and scheduling</span>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Published posts</p><p className="text-2xl font-bold">{String(stats.publishedPosts || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Scheduled posts</p><p className="text-2xl font-bold">{String(stats.scheduledPosts || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Failed posts</p><p className="text-2xl font-bold">{String(stats.failedPosts || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Queue backlog</p><p className="text-2xl font-bold">{String(stats.queueBacklog || 0)}</p></div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Connected Accounts</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {accounts.map((a) => (
            <span key={String(a.id)} className="rounded-full border px-3 py-1">
              {String(a.platform)}: {String(a.status)}
            </span>
          ))}
          {accounts.length === 0 && <span className="text-gray-500">No accounts connected</span>}
        </div>
      </div>

      {adminUser?.role === "super_admin" && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Distribution Rules & Approval Settings</h3>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label><input type="checkbox" checked={Boolean(settingsDraft.autoPublishEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, autoPublishEnabled: e.target.checked }))} /> Auto publish enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.requireApprovalBeforePosting)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApprovalBeforePosting: e.target.checked }))} /> Require approval before posting</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.requireApprovalForHighRiskCategories)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApprovalForHighRiskCategories: e.target.checked }))} /> Require approval for high-risk categories</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.allowEditorsScheduleOnly)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowEditorsScheduleOnly: e.target.checked }))} /> Allow editors to schedule only</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.allowOnlySuperAdminImmediatePublish)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowOnlySuperAdminImmediatePublish: e.target.checked }))} /> Only super admin can publish now</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.publishBreakingImmediately)} onChange={(e) => setSettingsDraft((p) => ({ ...p, publishBreakingImmediately: e.target.checked }))} /> Publish breaking immediately</label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm">
            <label>Business start hour<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.businessHoursStart || 9)} onChange={(e) => setSettingsDraft((p) => ({ ...p, businessHoursStart: Number(e.target.value) }))} /></label>
            <label>Business end hour<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.businessHoursEnd || 21)} onChange={(e) => setSettingsDraft((p) => ({ ...p, businessHoursEnd: Number(e.target.value) }))} /></label>
            <label>Retry limit<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.maxRetries || 3)} onChange={(e) => setSettingsDraft((p) => ({ ...p, maxRetries: Number(e.target.value) }))} /></label>
            <label>Timezone<input className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.timezone || "Asia/Kolkata")} onChange={(e) => setSettingsDraft((p) => ({ ...p, timezone: e.target.value }))} /></label>
          </div>
          <button className="mt-4 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveSettings}>Save Settings</button>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Article Select</h3>
          <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="w-full rounded border p-2 text-sm" value={selectedArticleId} onChange={(e) => setSelectedArticleId(e.target.value)} size={8}>
            {filteredNews.map((n) => <option key={n.id} value={n.id}>{n.titleEn || n.titleHi}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI Content Generator + Platform Preview</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <button className="rounded border px-3 py-2 text-sm" onClick={() => generate(false)}><Wand2 className="mr-1 inline h-4 w-4" />Generate</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => generate(true)}><AlertTriangle className="mr-1 inline h-4 w-4" />Breaking Version</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Platform
              <select className="mt-1 w-full rounded border px-2 py-1" value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-sm">Schedule At (optional)
              <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </label>
          </div>
          <textarea className="mt-3 w-full rounded border px-3 py-2 text-sm" rows={6} placeholder="Generated text..." value={editableText} onChange={(e) => setEditableText(e.target.value)} />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="hashtags,comma,separated" value={hashtags.join(",")} onChange={(e) => setHashtags(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="CTA" value={cta} onChange={(e) => setCta(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white" onClick={() => schedulePost(false)}><CalendarClock className="mr-1 inline h-4 w-4" />Schedule</button>
            <button className="rounded border px-4 py-2 text-sm" onClick={() => schedulePost(true)}><Send className="mr-1 inline h-4 w-4" />Publish Now</button>
            <button className="rounded border px-4 py-2 text-sm" onClick={processQueue}><Layers className="mr-1 inline h-4 w-4" />Process Queue</button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Campaign Manager</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Campaign name" value={campaign.name} onChange={(e) => setCampaign((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded border px-3 py-2 text-sm" type="date" value={campaign.startDate} onChange={(e) => setCampaign((p) => ({ ...p, startDate: e.target.value }))} />
          <input className="rounded border px-3 py-2 text-sm" type="date" value={campaign.endDate} onChange={(e) => setCampaign((p) => ({ ...p, endDate: e.target.value }))} />
          <button className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={createCampaign}>Create Campaign</button>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-gray-500"><th className="py-2">Name</th><th>Status</th><th>Platforms</th><th>Generated</th><th>Published</th></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={String(c.id)} className="border-b">
                  <td className="py-2">{String(c.name)}</td>
                  <td>{String(c.status)}</td>
                  <td>{Array.isArray(c.platforms) ? (c.platforms as string[]).join(", ") : "-"}</td>
                  <td>{String(c.postsGenerated || 0)}</td>
                  <td>{String(c.postsPublished || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a2b4c]">Post Queue + Bulk Actions</h3>
          <div className="flex gap-2 text-xs">
            <button className="rounded border px-2 py-1" onClick={() => runBulkAction("publish")}>Bulk publish</button>
            <button className="rounded border px-2 py-1" onClick={() => runBulkAction("regenerate_captions")}>Bulk regenerate captions</button>
            <button className="rounded border px-2 py-1" onClick={() => runBulkAction("regenerate_hashtags")}>Bulk regenerate hashtags</button>
            <button className="rounded border px-2 py-1 text-red-600" onClick={() => runBulkAction("cancel")}>Bulk cancel</button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-gray-500"><th className="py-2"></th><th>Article</th><th>Platform</th><th>Status</th><th>Scheduled</th><th>Retry</th><th>Error</th></tr></thead>
            <tbody>
              {queue.map((q) => (
                <tr key={String(q.id)} className="border-b">
                  <td className="py-2"><input type="checkbox" checked={selectedQueueIds.includes(String(q.id))} onChange={(e) => setSelectedQueueIds((prev) => e.target.checked ? [...prev, String(q.id)] : prev.filter((id) => id !== String(q.id)))} /></td>
                  <td>{String(q.articleId)}</td>
                  <td>{String(q.platform)}</td>
                  <td>{String(q.status)}</td>
                  <td>{String(q.scheduledAt || "-")}</td>
                  <td>{String(q.retryCount || 0)}</td>
                  <td className="max-w-[240px] truncate text-red-600">{String(q.errorMessage || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#1a2b4c]"><BarChart3 size={16} /> Social Analytics + Logs</h3>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <p><strong>Top platform:</strong> {String(stats.topPerformingPlatform || "n/a")}</p>
          <p><strong>Top category:</strong> {String(stats.topPerformingCategory || "n/a")}</p>
          <p><strong>Connected accounts:</strong> {String(stats.connectedAccounts || 0)}</p>
          <p><strong>Queue backlog:</strong> {String(stats.queueBacklog || 0)}</p>
        </div>
        <div className="max-h-72 overflow-auto rounded border p-2 text-sm">
          {logs.map((l) => (
            <div key={String(l.id)} className="mb-2 rounded border p-2">
              <p className="font-medium">{String(l.actionType)}</p>
              <p className="text-xs text-gray-500">{String(l.message)} · {String(l.status)} · {String(l.createdAt)}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-gray-500">No logs yet</p>}
        </div>
      </div>
    </RoleGuard>
  );
}
