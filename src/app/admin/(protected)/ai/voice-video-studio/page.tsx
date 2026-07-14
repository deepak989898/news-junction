"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Captions, Clapperboard, Check, X, Save, Upload, FileAudio, Play, ExternalLink, Copy, Info } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllNewsForAdmin } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveAudioVideoApi,
  generateAudioApi,
  generateDigestApi,
  generateSubtitlesApi,
  generateVideoPackageApi,
  generateVoiceScriptApi,
  getVoiceVideoStudioApi,
  renderVideoPackageApi,
} from "@/lib/ai-voice-video/client-api";
import { VOICE_SCRIPT_ACTIONS } from "@/lib/ai-voice-video/defaults";
import toast from "react-hot-toast";

const DIGEST_TYPES = ["morning_bulletin", "evening_bulletin", "top5", "category", "breaking_recap"] as const;
const PLATFORMS = ["youtube_shorts", "instagram_reels", "facebook_reels", "telegram"] as const;

function statusBadgeClass(status: string) {
  switch (String(status).toLowerCase()) {
    case "published":
      return "bg-green-100 text-green-800 border-green-300";
    case "approved":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "generated":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function resolveLinkedAudio(
  pkg: Record<string, unknown>,
  audioAssets: Record<string, unknown>[]
): Record<string, unknown> | null {
  const id = String(pkg.audioAssetId || "");
  if (!id) return null;
  return audioAssets.find((a) => String(a.id) === id) || null;
}

export default function VoiceVideoStudioPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [studio, setStudio] = useState<Record<string, unknown> | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("youtube_shorts");
  const [action, setAction] = useState<(typeof VOICE_SCRIPT_ACTIONS)[number]>("hindi_voice_script");
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("NewsJunction,LatestNews");
  const [audioId, setAudioId] = useState("");
  const [subtitleUrl, setSubtitleUrl] = useState("");
  const [digestType, setDigestType] = useState<(typeof DIGEST_TYPES)[number]>("morning_bulletin");
  const [selectedDigestIds, setSelectedDigestIds] = useState<string[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const withBusy = async (key: string, label: string, fn: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(key);
    const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
    try {
      await runWithAdminBusy(label, fn);
    } finally {
      setBusyAction(null);
    }
  };

  const refresh = async () => {
    const [news, data] = await Promise.all([getAllNewsForAdmin(), getVoiceVideoStudioApi()]);
    setArticles(news.filter((n) => n.status === "published"));
    setStudio(data as Record<string, unknown>);
    setSettingsDraft(((data as Record<string, unknown>).settings as Record<string, unknown>) || {});
    if (!selectedArticleId && news.length) setSelectedArticleId(news[0].id);
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load voice/video studio");
      setLoading(false);
    });
  }, []);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  const usage = (studio?.usage || {}) as Record<string, unknown>;
  const logs = (studio?.logs as Record<string, unknown>[]) || [];
  const audioAssets = (studio?.audioAssets as Record<string, unknown>[]) || [];
  const subtitleAssets = (studio?.subtitleAssets as Record<string, unknown>[]) || [];
  const videoPackages = (studio?.videoPackages as Record<string, unknown>[]) || [];
  const digests = (studio?.newsDigests as Record<string, unknown>[]) || [];

  const filteredAudio = audioAssets.filter((a) => (selectedArticleId ? a.articleId === selectedArticleId : true));
  const filteredSubtitles = subtitleAssets.filter((s) => (selectedArticleId ? s.articleId === selectedArticleId : true));
  const filteredPackages = videoPackages.filter((p) => (selectedArticleId ? p.articleId === selectedArticleId : true));

  const runScript = async () => {
    if (!selectedArticleId) return toast.error("Select an article first");
    await withBusy("script", "Generating voice script… please wait", async () => {
      const result = (await generateVoiceScriptApi({
        articleId: selectedArticleId,
        action,
        language,
      })) as Record<string, unknown>;
      setScript(String(result.script || ""));
      if (action.includes("caption")) setCaption(String(result.script || ""));
      if (action === "hashtags") setHashtags(String(result.script || "").replace(/#/g, ""));
      toast.success("Script generated");
      await refresh();
    });
  };

  const runAudio = async () => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate or edit script first");
    await withBusy("audio", "Generating audio… please wait", async () => {
      const res = (await generateAudioApi({
        articleId: selectedArticleId,
        language,
        script,
      })) as Record<string, unknown>;
      setAudioId(String(res.id || ""));
      toast.success("Audio generated");
      await refresh();
    });
  };

  const runSubtitle = async (format: "srt" | "vtt") => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate script first");
    await withBusy(`sub-${format}`, `Generating ${format.toUpperCase()}… please wait`, async () => {
      const res = (await generateSubtitlesApi({
        articleId: selectedArticleId,
        language,
        script,
        format,
      })) as Record<string, unknown>;
      setSubtitleUrl(String(res.subtitleUrl || ""));
      toast.success(`${format.toUpperCase()} subtitle generated`);
      await refresh();
    });
  };

  const runVideoPackage = async () => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate script first");
    let linkedAudioId = audioId;
    if (!linkedAudioId) {
      const latest = audioAssets
        .filter((a) => String(a.articleId) === selectedArticleId && String(a.status) !== "rejected")
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
      linkedAudioId = latest ? String(latest.id) : "";
    }
    if (!linkedAudioId) {
      toast.error("Generate audio first, then create video package");
      return;
    }
    await withBusy("video", "Generating video package… please wait", async () => {
      try {
        await generateVideoPackageApi({
          articleId: selectedArticleId,
          language,
          platform,
          script,
          audioAssetId: linkedAudioId,
          subtitleUrl: subtitleUrl || undefined,
          caption,
          hashtags: hashtags.split(",").map((x) => x.trim()).filter(Boolean),
        });
        toast.success("Reel MP4 generated — preview below");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Video package failed");
        await refresh();
      }
    });
  };

  const rerunReelRender = async (packageId: string) => {
    setRenderingId(packageId);
    const { runWithAdminBusy } = await import("@/lib/admin/busy-store");
    try {
      await runWithAdminBusy("Rendering reel MP4… please wait", async () => {
        await renderVideoPackageApi({ packageId });
        toast.success("Reel MP4 rendered");
        await refresh();
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-render failed");
      await refresh();
    } finally {
      setRenderingId(null);
    }
  };

  const runDigest = async () => {
    if (!selectedDigestIds.length) return toast.error("Select articles for digest");
    await withBusy("digest", "Generating digest… please wait", async () => {
      await generateDigestApi({
        digestType,
        articleIds: selectedDigestIds,
      });
      toast.success("Digest generated");
      await refresh();
    });
  };

  const reviewItem = async (type: "audio" | "video_package" | "digest", id: string, actionName: "approve" | "reject" | "publish" | "save_draft") => {
    await withBusy(`review-${id}-${actionName}`, `${actionName.replace("_", " ")}… please wait`, async () => {
      await approveAudioVideoApi({ type, id, action: actionName });
      toast.success(`${actionName} done`);
      await refresh();
    });
  };

  const saveTtsSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can change TTS settings");
    await withBusy("tts", "Saving TTS settings…", async () => {
      await approveAudioVideoApi({
        operation: "update_tts_settings",
        patch: settingsDraft,
      });
      toast.success("TTS settings updated");
      await refresh();
    });
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="AI Voice & Video Studio" actions={<span className="text-sm text-gray-500">Voice, subtitles, reels packages, digests</span>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Daily audio usage</p><p className="text-2xl font-bold">{String(usage.dailyAudioCount || 0)} / {String(usage.dailyLimit || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Monthly audio usage</p><p className="text-2xl font-bold">{String(usage.monthlyAudioCount || 0)} / {String(usage.monthlyLimit || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Monthly TTS cost</p><p className="text-2xl font-bold">${Number(usage.monthlyCost || 0).toFixed(2)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Generated packages</p><p className="text-2xl font-bold">{String(videoPackages.length || 0)}</p></div>
      </div>

      {Boolean(usage.limitExceeded) && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          TTS generation paused due to daily/monthly limits.
        </div>
      )}

      {adminUser?.role === "super_admin" && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">TTS Settings</h3>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label>Provider
              <select className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.provider || "openai_tts")} onChange={(e) => setSettingsDraft((p) => ({ ...p, provider: e.target.value }))}>
                <option value="openai_tts">OpenAI TTS</option>
                <option value="google_cloud_tts">Google Cloud TTS (placeholder)</option>
                <option value="elevenlabs">ElevenLabs (placeholder)</option>
              </select>
            </label>
            <label>Hindi Voice<input className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.defaultHindiVoice || "alloy")} onChange={(e) => setSettingsDraft((p) => ({ ...p, defaultHindiVoice: e.target.value }))} /></label>
            <label>English Voice<input className="mt-1 w-full rounded border px-2 py-1" value={String(settingsDraft.defaultEnglishVoice || "alloy")} onChange={(e) => setSettingsDraft((p) => ({ ...p, defaultEnglishVoice: e.target.value }))} /></label>
            <label>Speed<input className="mt-1 w-full rounded border px-2 py-1" type="number" step="0.1" value={Number(settingsDraft.speed || 1)} onChange={(e) => setSettingsDraft((p) => ({ ...p, speed: Number(e.target.value) }))} /></label>
            <label>Pitch<input className="mt-1 w-full rounded border px-2 py-1" type="number" step="0.1" value={Number(settingsDraft.pitch || 0)} onChange={(e) => setSettingsDraft((p) => ({ ...p, pitch: Number(e.target.value) }))} /></label>
            <label>Daily Limit<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.dailyLimit || 50)} onChange={(e) => setSettingsDraft((p) => ({ ...p, dailyLimit: Number(e.target.value) }))} /></label>
            <label>Monthly Limit<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.monthlyLimit || 1000)} onChange={(e) => setSettingsDraft((p) => ({ ...p, monthlyLimit: Number(e.target.value) }))} /></label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.requireApproval)} onChange={(e) => setSettingsDraft((p) => ({ ...p, requireApproval: e.target.checked }))} /> Require approval</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.autoGenerateForBreakingNews)} onChange={(e) => setSettingsDraft((p) => ({ ...p, autoGenerateForBreakingNews: e.target.checked }))} /> Auto-generate for breaking news</label>
          </div>
          <button className="mt-3 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveTtsSettings}>Save TTS Settings</button>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Article Selector</h3>
          <select className="w-full rounded border p-2 text-sm" value={selectedArticleId} onChange={(e) => setSelectedArticleId(e.target.value)} size={10}>
            {articles.map((a) => <option key={a.id} value={a.id}>{a.titleEn || a.titleHi}</option>)}
          </select>
          {selectedArticle && <p className="mt-2 text-xs text-gray-500">Selected: {selectedArticle.titleEn || selectedArticle.titleHi}</p>}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Script, Audio, Subtitle, Video Package</h3>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label>Language
              <select className="mt-1 w-full rounded border px-2 py-1" value={language} onChange={(e) => setLanguage(e.target.value as "hi" | "en")}>
                <option value="hi">Hindi</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>Script Action
              <select className="mt-1 w-full rounded border px-2 py-1" value={action} onChange={(e) => setAction(e.target.value as (typeof VOICE_SCRIPT_ACTIONS)[number])}>
                {VOICE_SCRIPT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>Platform
              <select className="mt-1 w-full rounded border px-2 py-1" value={platform} onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!!busyAction} onClick={runScript}><Mic className="mr-1 inline h-4 w-4" />{busyAction === "script" ? "Generating…" : "Generate Script"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!!busyAction} onClick={runAudio}><FileAudio className="mr-1 inline h-4 w-4" />{busyAction === "audio" ? "Generating…" : "Generate Audio"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!!busyAction} onClick={() => runSubtitle("srt")}><Captions className="mr-1 inline h-4 w-4" />{busyAction === "sub-srt" ? "Generating…" : "Generate SRT"}</button>
            <button className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!!busyAction} onClick={() => runSubtitle("vtt")}><Captions className="mr-1 inline h-4 w-4" />{busyAction === "sub-vtt" ? "Generating…" : "Generate VTT"}</button>
            <button className="rounded bg-[#c41e20] px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={!!busyAction} onClick={runVideoPackage}><Clapperboard className="mr-1 inline h-4 w-4" />{busyAction === "video" ? "Generating…" : "Generate Video Package"}</button>
          </div>
          <textarea className="mt-3 w-full rounded border px-3 py-2 text-sm" rows={7} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Script editor..." />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Social caption" />
          <input className="mt-2 w-full rounded border px-3 py-2 text-sm" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="Hashtags comma separated" />
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Audio Preview & Approval</h3>
          <div className="space-y-3">
            {filteredAudio.map((a) => (
              <div key={String(a.id)} className="rounded border p-3">
                <p className="text-sm font-medium">{String(a.language)} · {String(a.status)} · {String(a.voice)}</p>
                <audio controls className="mt-2 w-full" controlsList="nodownload">
                  <source src={String(a.audioUrl)} type="audio/mpeg" />
                </audio>
                <div className="mt-2 flex gap-2 text-xs">
                  <button className="rounded border px-2 py-1 text-green-700" onClick={() => reviewItem("audio", String(a.id), "approve")}><Check className="mr-1 inline h-3 w-3" />Approve</button>
                  <button className="rounded border px-2 py-1 text-red-700" onClick={() => reviewItem("audio", String(a.id), "reject")}><X className="mr-1 inline h-3 w-3" />Reject</button>
                  <button className="rounded border px-2 py-1" onClick={() => reviewItem("audio", String(a.id), "publish")}><Upload className="mr-1 inline h-3 w-3" />Publish</button>
                  <button className="rounded border px-2 py-1" onClick={() => reviewItem("audio", String(a.id), "save_draft")}><Save className="mr-1 inline h-3 w-3" />Save Draft</button>
                </div>
              </div>
            ))}
            {!filteredAudio.length && <p className="text-sm text-gray-500">No audio generated yet.</p>}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Subtitle Preview</h3>
          <div className="space-y-2 text-sm">
            {filteredSubtitles.map((s) => (
              <div key={String(s.id)} className="rounded border p-2">
                <p>{String(s.language)} · {String(s.format)}</p>
                <a href={String(s.subtitleUrl)} target="_blank" rel="noopener noreferrer" className="text-[#c41e20] hover:underline">Open subtitle file</a>
              </div>
            ))}
            {!filteredSubtitles.length && <p className="text-gray-500">No subtitles generated yet.</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-[#1a2b4c]">Video Package Preview & Approval</h3>
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="flex items-start gap-2 font-medium">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            How to preview & publish
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-blue-800">
            <li>Generate <strong>Script</strong> → <strong>Audio</strong> → <strong>Generate Video Package</strong> — builds a 9:16 MP4 reel automatically.</li>
            <li>
              <strong>Preview</strong> = play the <strong>MP4 video</strong> below (thumbnail + voiceover combined).
            </li>
            <li>
              <strong>Approve</strong> → <strong>Publish Package</strong> → post via{" "}
              <a href="/admin/ai/social-manager" className="font-semibold text-[#c41e20] underline">
                AI Social Manager
              </a>{" "}
              or download MP4 for manual upload.
            </li>
          </ol>
        </div>
        <div className="space-y-4">
          {filteredPackages.map((p) => {
            const linkedAudio = resolveLinkedAudio(p, audioAssets);
            const audioUrl = linkedAudio ? String(linkedAudio.audioUrl || "") : "";
            const thumbnailUrl = String(p.thumbnailUrl || "");
            const videoUrl = String(p.videoUrl || "");
            const renderStatus = String(p.renderStatus || "");
            const renderError = String(p.renderError || "");
            const videoDurationSec = Number(p.videoDurationSec || 0);
            const subtitleUrlPkg = String(p.subtitleUrl || "");
            const status = String(p.status || "draft");
            const scenes = (p.scenes as Record<string, unknown>[]) || [];
            const canPublish = status === "approved" || status === "generated";

            return (
              <div key={String(p.id)} className={`rounded-lg border p-4 ${status === "published" ? "border-green-300 bg-green-50/40" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">
                    {String(p.platform).replace(/_/g, " ")} · {String(p.language)} · {String(p.id).slice(0, 8)}…
                  </p>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(status)}`}>
                    {status}
                  </span>
                </div>

                {p.caption ? <p className="mt-2 text-sm text-gray-700">{String(p.caption)}</p> : null}
                {Array.isArray(p.hashtags) && (p.hashtags as string[]).length > 0 ? (
                  <p className="mt-1 text-xs text-gray-500">#{((p.hashtags as string[]) || []).join(" #")}</p>
                ) : null}

                {renderStatus ? (
                  <p className={`mt-2 text-xs font-medium ${renderStatus === "success" ? "text-green-700" : renderStatus === "failed" ? "text-red-700" : "text-amber-700"}`}>
                    MP4 render: {renderStatus}
                    {videoDurationSec > 0 ? ` · ${videoDurationSec}s` : ""}
                    {renderError ? ` — ${renderError}` : ""}
                  </p>
                ) : null}

                {videoUrl ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Reel video preview (MP4 · 9:16)</p>
                    <div className="max-w-xs overflow-hidden rounded-lg border bg-black">
                      <video controls className="aspect-[9/16] w-full bg-black" preload="metadata" playsInline>
                        <source src={videoUrl} type="video/mp4" />
                      </video>
                    </div>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#c41e20] hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      Download MP4
                    </a>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    No MP4 yet.
                    <button
                      type="button"
                      className="ml-2 rounded border border-[#1a2b4c] bg-[#1a2b4c] px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={renderingId === String(p.id) || !audioUrl}
                      onClick={() => rerunReelRender(String(p.id))}
                    >
                      {renderingId === String(p.id) ? "Rendering…" : "Generate MP4 Reel"}
                    </button>
                  </div>
                )}

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Visual preview (thumbnail)</p>
                    {thumbnailUrl ? (
                      <div className="relative max-w-xs overflow-hidden rounded-lg border bg-gray-900">
                        <img src={thumbnailUrl} alt="Reel thumbnail" className="h-52 w-full object-cover" />
                        <a
                          href={thumbnailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-black"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open image
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700">No thumbnail — regenerate package or check article image.</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Audio preview (play reel voiceover)</p>
                    {audioUrl ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <p className="mb-2 flex items-center gap-1 text-xs text-green-800">
                          <Play className="h-3 w-3" />
                          Linked audio · {String(linkedAudio?.voice || "TTS")} · {String(linkedAudio?.status || "")}
                        </p>
                        <audio controls className="w-full" preload="metadata">
                          <source src={audioUrl} type="audio/mpeg" />
                        </audio>
                        <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#c41e20] hover:underline">
                          <ExternalLink className="h-3 w-3" />
                          Download MP3
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        No audio linked. Generate audio first, then regenerate video package with the same article selected.
                      </div>
                    )}

                    {subtitleUrlPkg ? (
                      <a
                        href={subtitleUrlPkg}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#c41e20] hover:underline"
                      >
                        <Captions className="h-3 w-3" />
                        Open subtitle file
                      </a>
                    ) : null}
                  </div>
                </div>

                {scenes.length > 0 && (
                  <details className="mt-3 rounded border bg-gray-50 p-2 text-sm">
                    <summary className="cursor-pointer font-medium text-[#1a2b4c]">Scene script ({scenes.length} scenes)</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-700">
                      {scenes.map((s) => (
                        <li key={String(s.index)}>
                          {String(s.line)}
                          {s.visualSuggestion ? (
                            <span className="block text-xs text-gray-500">{String(s.visualSuggestion)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {p.caption ? (
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      onClick={() => {
                        void navigator.clipboard.writeText(String(p.caption));
                        toast.success("Caption copied");
                      }}
                    >
                      <Copy className="mr-1 inline h-3 w-3" />
                      Copy caption
                    </button>
                  ) : null}
                  <button
                    className="rounded border border-green-300 bg-green-50 px-2 py-1 text-green-800 disabled:opacity-40"
                    disabled={status === "approved" || status === "published"}
                    onClick={() => reviewItem("video_package", String(p.id), "approve")}
                  >
                    <Check className="mr-1 inline h-3 w-3" />
                    Approve
                  </button>
                  <button
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800"
                    onClick={() => reviewItem("video_package", String(p.id), "reject")}
                  >
                    <X className="mr-1 inline h-3 w-3" />
                    Reject
                  </button>
                  <button
                    className="rounded border border-[#1a2b4c] bg-[#1a2b4c] px-2 py-1 font-semibold text-white disabled:opacity-40"
                    disabled={!canPublish}
                    title={status === "published" ? "Already published" : "Mark package as published / ready for social"}
                    onClick={() => reviewItem("video_package", String(p.id), "publish")}
                  >
                    <Upload className="mr-1 inline h-3 w-3" />
                    Publish Package
                  </button>
                  <button className="rounded border px-2 py-1" onClick={() => reviewItem("video_package", String(p.id), "save_draft")}>
                    <Save className="mr-1 inline h-3 w-3" />
                    Save Draft
                  </button>
                  {videoUrl ? (
                    <button
                      type="button"
                      className="rounded border px-2 py-1"
                      disabled={renderingId === String(p.id)}
                      onClick={() => rerunReelRender(String(p.id))}
                    >
                      {renderingId === String(p.id) ? "Re-rendering…" : "Re-render MP4"}
                    </button>
                  ) : null}
                  {status === "published" && (
                    <a
                      href="/admin/ai/social-manager"
                      className="rounded border border-green-400 bg-green-100 px-2 py-1 font-medium text-green-900 hover:bg-green-200"
                    >
                      → Post on Social Manager
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {!filteredPackages.length && <p className="text-sm text-gray-500">No video package generated yet.</p>}
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Daily Digest Builder</h3>
        <div className="mb-2 flex flex-wrap gap-2">
          <select className="rounded border px-2 py-1 text-sm" value={digestType} onChange={(e) => setDigestType(e.target.value as (typeof DIGEST_TYPES)[number])}>
            {DIGEST_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="rounded bg-[#1a2b4c] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50" disabled={!!busyAction} onClick={runDigest}>{busyAction === "digest" ? "Generating…" : "Generate Digest"}</button>
        </div>
        <div className="max-h-44 overflow-y-auto rounded border p-2 text-sm">
          {articles.slice(0, 40).map((a) => (
            <label key={a.id} className="block">
              <input
                type="checkbox"
                checked={selectedDigestIds.includes(a.id)}
                onChange={(e) => setSelectedDigestIds((prev) => e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id))}
              />{" "}
              {a.titleEn || a.titleHi}
            </label>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {digests.map((d) => (
            <div key={String(d.id)} className="rounded border p-2 text-sm">
              <p className="font-medium">{String(d.titleEn)}</p>
              <p>Status: {String(d.status)}</p>
              <div className="mt-1 flex gap-2 text-xs">
                <button className="rounded border px-2 py-1 text-green-700" onClick={() => reviewItem("digest", String(d.id), "approve")}>Approve</button>
                <button className="rounded border px-2 py-1 text-red-700" onClick={() => reviewItem("digest", String(d.id), "reject")}>Reject</button>
                <button className="rounded border px-2 py-1" onClick={() => reviewItem("digest", String(d.id), "publish")}>Publish</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Voice/Video Logs</h3>
        <div className="max-h-80 overflow-auto">
          {logs.map((l) => (
            <div key={String(l.id)} className="mb-2 rounded border p-2 text-sm">
              <p className="font-medium">{String(l.actionType)} · {String(l.status)}</p>
              <p className="text-xs text-gray-500">{String(l.outputPreview || l.inputPreview || "")}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-500">No logs yet.</p>}
        </div>
      </div>
    </RoleGuard>
  );
}
