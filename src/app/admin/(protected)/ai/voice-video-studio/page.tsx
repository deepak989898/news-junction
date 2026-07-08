"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Captions, Clapperboard, Check, X, Save, Upload, FileAudio } from "lucide-react";
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
} from "@/lib/ai-voice-video/client-api";
import { VOICE_SCRIPT_ACTIONS } from "@/lib/ai-voice-video/defaults";
import toast from "react-hot-toast";

const DIGEST_TYPES = ["morning_bulletin", "evening_bulletin", "top5", "category", "breaking_recap"] as const;
const PLATFORMS = ["youtube_shorts", "instagram_reels", "facebook_reels", "telegram"] as const;

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
  };

  const runAudio = async () => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate or edit script first");
    const res = (await generateAudioApi({
      articleId: selectedArticleId,
      language,
      script,
    })) as Record<string, unknown>;
    setAudioId(String(res.id || ""));
    toast.success("Audio generated");
    await refresh();
  };

  const runSubtitle = async (format: "srt" | "vtt") => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate script first");
    const res = (await generateSubtitlesApi({
      articleId: selectedArticleId,
      language,
      script,
      format,
    })) as Record<string, unknown>;
    setSubtitleUrl(String(res.subtitleUrl || ""));
    toast.success(`${format.toUpperCase()} subtitle generated`);
    await refresh();
  };

  const runVideoPackage = async () => {
    if (!selectedArticleId || !script.trim()) return toast.error("Generate script first");
    await generateVideoPackageApi({
      articleId: selectedArticleId,
      language,
      platform,
      script,
      audioAssetId: audioId || undefined,
      subtitleUrl: subtitleUrl || undefined,
      caption,
      hashtags: hashtags.split(",").map((x) => x.trim()).filter(Boolean),
    });
    toast.success("Video package generated");
    await refresh();
  };

  const runDigest = async () => {
    if (!selectedDigestIds.length) return toast.error("Select articles for digest");
    await generateDigestApi({
      digestType,
      articleIds: selectedDigestIds,
    });
    toast.success("Digest generated");
    await refresh();
  };

  const reviewItem = async (type: "audio" | "video_package" | "digest", id: string, actionName: "approve" | "reject" | "publish" | "save_draft") => {
    await approveAudioVideoApi({ type, id, action: actionName });
    toast.success(`${actionName} successful`);
    await refresh();
  };

  const saveTtsSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can change TTS settings");
    await approveAudioVideoApi({
      operation: "update_tts_settings",
      patch: settingsDraft,
    });
    toast.success("TTS settings updated");
    await refresh();
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
            <button className="rounded border px-3 py-2 text-sm" onClick={runScript}><Mic className="mr-1 inline h-4 w-4" />Generate Script</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={runAudio}><FileAudio className="mr-1 inline h-4 w-4" />Generate Audio</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runSubtitle("srt")}><Captions className="mr-1 inline h-4 w-4" />Generate SRT</button>
            <button className="rounded border px-3 py-2 text-sm" onClick={() => runSubtitle("vtt")}><Captions className="mr-1 inline h-4 w-4" />Generate VTT</button>
            <button className="rounded bg-[#c41e20] px-3 py-2 text-sm font-bold text-white" onClick={runVideoPackage}><Clapperboard className="mr-1 inline h-4 w-4" />Generate Video Package</button>
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
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Video Package Preview & Approval</h3>
        <div className="space-y-3">
          {filteredPackages.map((p) => (
            <div key={String(p.id)} className="rounded border p-3">
              <p className="text-sm font-medium">{String(p.platform)} · {String(p.language)} · {String(p.status)}</p>
              <p className="text-sm text-gray-600">{String(p.caption || "")}</p>
              {String(p.thumbnailUrl || "") && <img src={String(p.thumbnailUrl)} alt="thumbnail" className="mt-2 h-28 rounded object-cover" />}
              <div className="mt-2 flex gap-2 text-xs">
                <button className="rounded border px-2 py-1 text-green-700" onClick={() => reviewItem("video_package", String(p.id), "approve")}>Approve</button>
                <button className="rounded border px-2 py-1 text-red-700" onClick={() => reviewItem("video_package", String(p.id), "reject")}>Reject</button>
                <button className="rounded border px-2 py-1" onClick={() => reviewItem("video_package", String(p.id), "publish")}>Publish Package</button>
                <button className="rounded border px-2 py-1" onClick={() => reviewItem("video_package", String(p.id), "save_draft")}>Save Draft</button>
              </div>
            </div>
          ))}
          {!filteredPackages.length && <p className="text-sm text-gray-500">No video package generated yet.</p>}
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Daily Digest Builder</h3>
        <div className="mb-2 flex flex-wrap gap-2">
          <select className="rounded border px-2 py-1 text-sm" value={digestType} onChange={(e) => setDigestType(e.target.value as (typeof DIGEST_TYPES)[number])}>
            {DIGEST_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="rounded bg-[#1a2b4c] px-4 py-1.5 text-sm font-bold text-white" onClick={runDigest}>Generate Digest</button>
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
