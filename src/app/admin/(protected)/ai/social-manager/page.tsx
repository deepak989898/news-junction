"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Send, Wand2, Layers, BarChart3, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
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
  publishSocialPostNowApi,
  scheduleSocialPostApi,
  updateSocialSettingsApi,
} from "@/lib/ai-social/client-api";
import toast from "react-hot-toast";

const UI_VERSION = "v2.1";
const PLATFORMS = ["facebook", "instagram", "x", "linkedin", "telegram"] as const;

type BusyAction =
  | "refresh"
  | "generate"
  | "generateBreaking"
  | "schedule"
  | "publishNow"
  | "processQueue"
  | "saveSettings"
  | "createCampaign"
  | "bulkPublish"
  | "bulkRegenerateCaptions"
  | "bulkRegenerateHashtags"
  | "bulkCancel";

type QueueProcessResult = {
  checked?: number;
  published?: number;
  failed?: number;
  skipped?: number;
  errors?: string[];
  skipReasons?: string[];
  timezone?: string;
  autoPublishEnabled?: boolean;
};

type PublishNowResult = {
  queueId?: string;
  published?: number;
  platform?: string;
  platformPostId?: string;
  pageId?: string;
  accountName?: string;
  error?: string;
};

const BUSY_LABELS: Record<BusyAction, string> = {
  refresh: "Refreshing dashboard...",
  generate: "AI is generating social captions...",
  generateBreaking: "AI is generating breaking version...",
  schedule: "Scheduling post...",
  publishNow: "Publishing to Facebook/Telegram...",
  processQueue: "Processing publish queue...",
  saveSettings: "Saving settings...",
  createCampaign: "Creating campaign...",
  bulkPublish: "Bulk publishing selected posts...",
  bulkRegenerateCaptions: "Regenerating captions...",
  bulkRegenerateHashtags: "Regenerating hashtags...",
  bulkCancel: "Cancelling selected posts...",
};

function formatQueueResult(result: QueueProcessResult): string {
  const parts = [
    `Checked: ${result.checked ?? 0}`,
    `Published: ${result.published ?? 0}`,
    `Failed: ${result.failed ?? 0}`,
    `Skipped: ${result.skipped ?? 0}`,
  ];
  let msg = parts.join(" · ");
  if (result.errors?.length) msg += `\nErrors: ${result.errors.join("; ")}`;
  if (result.skipReasons?.length) msg += `\nSkipped: ${result.skipReasons.join("; ")}`;
  return msg;
}

function BusyButton({
  busy,
  action,
  current,
  onClick,
  children,
  className = "",
  disabled = false,
  loadingLabel,
}: {
  busy: BusyAction | null;
  action: BusyAction;
  current: BusyAction;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingLabel?: string;
}) {
  const isLoading = busy === current;
  const isDisabled = Boolean(busy) || disabled;
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${isLoading ? "ring-2 ring-blue-400 ring-offset-1" : ""} ${className}`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="font-semibold">{loadingLabel || "Please wait..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default function AiSocialManagerPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction | null>(null);
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
  const [lastResult, setLastResult] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const load = async (silent = false) => {
    if (!silent) setBusy("refresh");
    try {
      const [newsData, dash] = await Promise.all([getAllNewsForAdmin(), getSocialDashboardApi()]);
      setNews(newsData);
      setDashboard(dash as Record<string, unknown>);
      setSettingsDraft((dash as Record<string, unknown>).settings as Record<string, unknown>);
      if (!selectedArticleId && newsData.length) setSelectedArticleId(newsData[0].id);
    } finally {
      if (!silent) setBusy(null);
    }
  };

  useEffect(() => {
    (async () => {
      await load(true);
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
  const autoPublishEnabled = Boolean(settingsDraft.autoPublishEnabled);

  const runProcessQueue = async (force = true) => {
    const toastId = toast.loading("Publishing queued posts...");
    try {
      const result = (await processSocialQueueApi({ limit: 30, force })) as QueueProcessResult;
      const summary = formatQueueResult(result);
      if ((result.published ?? 0) > 0) {
        toast.success(summary, { id: toastId, duration: 8000 });
      } else if ((result.failed ?? 0) > 0) {
        toast.error(summary, { id: toastId, duration: 10000 });
      } else {
        toast(summary, { id: toastId, duration: 8000, icon: "ℹ️" });
      }
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Queue processing failed", { id: toastId });
      throw e;
    }
  };

  const generate = async (breaking = false) => {
    if (!selectedArticleId) return toast.error("Select an article");
    const action: BusyAction = breaking ? "generateBreaking" : "generate";
    setBusy(action);
    const toastId = toast.loading(breaking ? "Generating breaking version..." : "Generating social captions...");
    try {
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
      toast.success("Social copy generated", { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed", { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const schedulePost = async (publishNow = false) => {
    if (!selectedArticleId || !selectedPlatform || !editableText) {
      return toast.error("Generate content first");
    }
    const action: BusyAction = publishNow ? "publishNow" : "schedule";
    setBusy(action);
    const toastId = toast.loading(BUSY_LABELS[action]);
    try {
      if (publishNow) {
        const result = (await publishSocialPostNowApi({
          articleId: selectedArticleId,
          platform: selectedPlatform,
          text: editableText,
          hashtags,
          cta,
          imageUrl: selectedArticle?.imageUrl || undefined,
          language: "en",
        })) as PublishNowResult;
        const msg = `Published to ${result.platform || selectedPlatform} (${result.accountName || "account"}) · Post ID: ${result.platformPostId || "n/a"}`;
        setLastResult({ type: "success", message: msg });
        toast.success(msg, { id: toastId, duration: 10000 });
      } else {
        await scheduleSocialPostApi({
          articleId: selectedArticleId,
          platform: selectedPlatform,
          text: editableText,
          hashtags,
          cta,
          imageUrl: selectedArticle?.imageUrl || undefined,
          language: "en",
          scheduledAt: scheduleAt || undefined,
          approvalStatus: "pending",
        });
        const msg = "Post scheduled — click Process Queue or enable Auto Publish to publish.";
        setLastResult({ type: "info", message: msg });
        toast.success(msg, { id: toastId });
      }
      await load(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : publishNow ? "Publish failed" : "Schedule failed";
      setLastResult({ type: "error", message: msg });
      toast.error(msg, { id: toastId, duration: 10000 });
    } finally {
      setBusy(null);
    }
  };

  const processQueue = async () => {
    setBusy("processQueue");
    try {
      const result = await runProcessQueue(true);
      if (result) {
        const summary = formatQueueResult(result);
        setLastResult({
          type: (result.published ?? 0) > 0 ? "success" : (result.failed ?? 0) > 0 ? "error" : "info",
          message: summary,
        });
      }
      await load(true);
    } finally {
      setBusy(null);
    }
  };

  const runBulkAction = async (
    action: "publish" | "cancel" | "regenerate_captions" | "regenerate_hashtags",
    busyKey: BusyAction
  ) => {
    if (!selectedQueueIds.length) return toast.error("Select queue items");
    setBusy(busyKey);
    const toastId = toast.loading(`Running bulk ${action.replace("_", " ")}...`);
    try {
      await bulkSocialActionApi({ queueIds: selectedQueueIds, action });
      if (action === "publish") {
        toast.loading("Publishing approved posts...", { id: toastId });
        await runProcessQueue(true);
      } else {
        toast.success(`Bulk ${action.replace("_", " ")} completed`, { id: toastId });
      }
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed", { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can update settings");
    setBusy("saveSettings");
    const toastId = toast.loading("Saving settings...");
    try {
      await updateSocialSettingsApi(settingsDraft);
      toast.success("Social settings updated", { id: toastId });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed", { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  const createCampaign = async () => {
    if (!campaign.name || !campaign.startDate || !campaign.endDate) return toast.error("Fill campaign details");
    setBusy("createCampaign");
    const toastId = toast.loading("Creating campaign...");
    try {
      await createCampaignApi({
        name: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        platforms: campaign.platforms,
        categories: campaign.categories,
        status: "draft",
      });
      toast.success("Campaign created", { id: toastId });
      setCampaign({ name: "", startDate: "", endDate: "", platforms: ["facebook"], categories: [] });
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Campaign creation failed", { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      {busy && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div className="mx-4 max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-[#1a2b4c] border-t-transparent" />
            <p className="text-lg font-bold text-[#1a2b4c]">{BUSY_LABELS[busy]}</p>
            <p className="mt-2 text-sm text-gray-500">Do not close this page until finished.</p>
          </div>
        </div>
      )}

      <AdminTopbar
        title="AI Social Manager"
        actions={
          <div className="flex items-center gap-3">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{UI_VERSION}</span>
            <span className="text-sm text-gray-500">Content distribution and scheduling</span>
            <BusyButton
              busy={busy}
              action="refresh"
              current="refresh"
              onClick={() => load().catch((e) => toast.error(e instanceof Error ? e.message : "Refresh failed"))}
              className="rounded border px-2 py-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </BusyButton>
          </div>
        }
      />

      {lastResult && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap ${
            lastResult.type === "success"
              ? "border-green-300 bg-green-50 text-green-900"
              : lastResult.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-blue-300 bg-blue-50 text-blue-900"
          }`}
        >
          <strong>Last action:</strong> {lastResult.message}
        </div>
      )}

      {busy && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {BUSY_LABELS[busy]}
        </div>
      )}

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
            <span key={String(a.id)} className={`rounded-full border px-3 py-1 ${String(a.status) === "connected" ? "border-green-300 bg-green-50 text-green-800" : ""}`}>
              {String(a.platform)}: {String(a.status)}
            </span>
          ))}
          {accounts.length === 0 && <span className="text-gray-500">No accounts connected</span>}
        </div>
      </div>

      {adminUser?.role === "super_admin" && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Distribution Rules & Approval Settings</h3>
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${autoPublishEnabled ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
            {autoPublishEnabled ? (
              <>
                Auto-publish is <strong>ON</strong>. Vercel cron runs once daily (~10 AM IST). During business hours ({String(settingsDraft.businessHoursStart || 9)}–{String(settingsDraft.businessHoursEnd || 21)} {String(settingsDraft.timezone || "Asia/Kolkata")}), approved posts publish automatically — or use <strong>Publish Now</strong> for instant posting.
              </>
            ) : (
              <>
                Auto-publish is <strong>OFF</strong>. After scheduling, click <strong>Publish Now</strong> or <strong>Process Queue</strong> to post to Facebook/Telegram.
              </>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.autoPublishEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, autoPublishEnabled: e.target.checked }))} /> Auto publish enabled</label>
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.requireApprovalBeforePosting)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApprovalBeforePosting: e.target.checked }))} /> Require approval before posting</label>
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.requireApprovalForHighRiskCategories)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApprovalForHighRiskCategories: e.target.checked }))} /> Require approval for high-risk categories</label>
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.allowEditorsScheduleOnly)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowEditorsScheduleOnly: e.target.checked }))} /> Allow editors to schedule only</label>
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.allowOnlySuperAdminImmediatePublish)} onChange={(e) => setSettingsDraft((p) => ({ ...p, allowOnlySuperAdminImmediatePublish: e.target.checked }))} /> Only super admin can publish now</label>
            <label><input type="checkbox" disabled={Boolean(busy)} checked={Boolean(settingsDraft.publishBreakingImmediately)} onChange={(e) => setSettingsDraft((p) => ({ ...p, publishBreakingImmediately: e.target.checked }))} /> Publish breaking immediately</label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm">
            <label>Business start hour<input className="mt-1 w-full rounded border px-2 py-1" type="number" disabled={Boolean(busy)} value={Number(settingsDraft.businessHoursStart || 9)} onChange={(e) => setSettingsDraft((p) => ({ ...p, businessHoursStart: Number(e.target.value) }))} /></label>
            <label>Business end hour<input className="mt-1 w-full rounded border px-2 py-1" type="number" disabled={Boolean(busy)} value={Number(settingsDraft.businessHoursEnd || 21)} onChange={(e) => setSettingsDraft((p) => ({ ...p, businessHoursEnd: Number(e.target.value) }))} /></label>
            <label>Retry limit<input className="mt-1 w-full rounded border px-2 py-1" type="number" disabled={Boolean(busy)} value={Number(settingsDraft.maxRetries || 3)} onChange={(e) => setSettingsDraft((p) => ({ ...p, maxRetries: Number(e.target.value) }))} /></label>
            <label>Timezone<input className="mt-1 w-full rounded border px-2 py-1" disabled={Boolean(busy)} value={String(settingsDraft.timezone || "Asia/Kolkata")} onChange={(e) => setSettingsDraft((p) => ({ ...p, timezone: e.target.value }))} /></label>
          </div>
          <BusyButton
            busy={busy}
            action="saveSettings"
            current="saveSettings"
            onClick={saveSettings}
            className="mt-4 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white"
          >
            Save Settings
          </BusyButton>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Article Select</h3>
          <input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={Boolean(busy)} />
          <select className="w-full rounded border p-2 text-sm" value={selectedArticleId} onChange={(e) => setSelectedArticleId(e.target.value)} size={8} disabled={Boolean(busy)}>
            {filteredNews.map((n) => <option key={n.id} value={n.id}>{n.titleEn || n.titleHi}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI Content Generator + Platform Preview</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <BusyButton busy={busy} action="generate" current="generate" loadingLabel="Generating..." onClick={() => generate(false)} className="rounded border px-3 py-2 text-sm">
              <Wand2 className="h-4 w-4" /> Generate
            </BusyButton>
            <BusyButton busy={busy} action="generateBreaking" current="generateBreaking" loadingLabel="Generating..." onClick={() => generate(true)} className="rounded border px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4" /> Breaking Version
            </BusyButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Platform
              <select className="mt-1 w-full rounded border px-2 py-1" value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} disabled={Boolean(busy)}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-sm">Schedule At (optional)
              <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} disabled={Boolean(busy)} />
            </label>
          </div>
          <textarea className="mt-3 w-full rounded border px-3 py-2 text-sm" rows={6} placeholder="Generated text..." value={editableText} onChange={(e) => setEditableText(e.target.value)} disabled={Boolean(busy)} />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="hashtags,comma,separated" value={hashtags.join(",")} onChange={(e) => setHashtags(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} disabled={Boolean(busy)} />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="CTA" value={cta} onChange={(e) => setCta(e.target.value)} disabled={Boolean(busy)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <BusyButton busy={busy} action="schedule" current="schedule" loadingLabel="Scheduling..." onClick={() => schedulePost(false)} className="rounded bg-[#c41e20] px-4 py-2 text-sm font-bold text-white">
              <CalendarClock className="h-4 w-4" /> Schedule
            </BusyButton>
            <BusyButton busy={busy} action="publishNow" current="publishNow" loadingLabel="Publishing..." onClick={() => schedulePost(true)} className="rounded border-2 border-[#1a2b4c] bg-white px-4 py-2 text-sm font-bold text-[#1a2b4c]">
              <Send className="h-4 w-4" /> Publish Now
            </BusyButton>
            <BusyButton busy={busy} action="processQueue" current="processQueue" loadingLabel="Processing queue..." onClick={processQueue} className="rounded border px-4 py-2 text-sm">
              <Layers className="h-4 w-4" /> Process Queue
            </BusyButton>
          </div>
          {generated && (
            <p className="mt-2 text-xs text-green-700">Content generated — review text above, then Schedule or Publish Now.</p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Campaign Manager</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border px-3 py-2 text-sm" placeholder="Campaign name" value={campaign.name} onChange={(e) => setCampaign((p) => ({ ...p, name: e.target.value }))} disabled={Boolean(busy)} />
          <input className="rounded border px-3 py-2 text-sm" type="date" value={campaign.startDate} onChange={(e) => setCampaign((p) => ({ ...p, startDate: e.target.value }))} disabled={Boolean(busy)} />
          <input className="rounded border px-3 py-2 text-sm" type="date" value={campaign.endDate} onChange={(e) => setCampaign((p) => ({ ...p, endDate: e.target.value }))} disabled={Boolean(busy)} />
          <BusyButton busy={busy} action="createCampaign" current="createCampaign" onClick={createCampaign} className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white">
            Create Campaign
          </BusyButton>
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
            <BusyButton busy={busy} action="bulkPublish" current="bulkPublish" onClick={() => runBulkAction("publish", "bulkPublish")} className="rounded border px-2 py-1">
              Bulk publish
            </BusyButton>
            <BusyButton busy={busy} action="bulkRegenerateCaptions" current="bulkRegenerateCaptions" onClick={() => runBulkAction("regenerate_captions", "bulkRegenerateCaptions")} className="rounded border px-2 py-1">
              Bulk regenerate captions
            </BusyButton>
            <BusyButton busy={busy} action="bulkRegenerateHashtags" current="bulkRegenerateHashtags" onClick={() => runBulkAction("regenerate_hashtags", "bulkRegenerateHashtags")} className="rounded border px-2 py-1">
              Bulk regenerate hashtags
            </BusyButton>
            <BusyButton busy={busy} action="bulkCancel" current="bulkCancel" onClick={() => runBulkAction("cancel", "bulkCancel")} className="rounded border px-2 py-1 text-red-600">
              Bulk cancel
            </BusyButton>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-gray-500"><th className="py-2"></th><th>Article</th><th>Platform</th><th>Status</th><th>Approval</th><th>Scheduled</th><th>Retry</th><th>Error</th></tr></thead>
            <tbody>
              {queue.map((q) => (
                <tr key={String(q.id)} className={`border-b ${String(q.status) === "published" ? "bg-green-50" : String(q.status) === "failed" ? "bg-red-50" : ""}`}>
                  <td className="py-2"><input type="checkbox" disabled={Boolean(busy)} checked={selectedQueueIds.includes(String(q.id))} onChange={(e) => setSelectedQueueIds((prev) => e.target.checked ? [...prev, String(q.id)] : prev.filter((id) => id !== String(q.id)))} /></td>
                  <td className="max-w-[120px] truncate">{String(q.articleId)}</td>
                  <td>{String(q.platform)}</td>
                  <td><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${String(q.status) === "published" ? "bg-green-200 text-green-900" : String(q.status) === "failed" ? "bg-red-200 text-red-900" : "bg-gray-200"}`}>{String(q.status)}</span></td>
                  <td>{String(q.approvalStatus || "-")}</td>
                  <td>{String(q.scheduledAt || "-")}</td>
                  <td>{String(q.retryCount || 0)}</td>
                  <td className="max-w-[240px] truncate text-red-600" title={String(q.errorMessage || "")}>{String(q.errorMessage || "-")}</td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-gray-500">No posts in queue</td></tr>
              )}
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
