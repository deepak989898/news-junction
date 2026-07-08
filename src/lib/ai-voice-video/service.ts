import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { callAI, estimateCost, estimateTokensFromText } from "@/lib/ai-studio/ai-client";
import { getAISettings, getArticleById } from "@/lib/ai-studio/server-db";
import { generateMediaAsset } from "@/lib/ai-media/service";
import { DEFAULT_TTS_SETTINGS, TTS_SETTINGS_DOC_ID, VOICE_VIDEO_SYSTEM_PROMPT, VoiceScriptAction } from "./defaults";
import {
  AudioAsset,
  AudioAssetStatus,
  NewsDigest,
  SubtitleAsset,
  TtsSettings,
  VideoPackage,
  VideoPlatform,
  VideoScene,
  VoiceVideoLanguage,
  VoiceVideoLog,
  VoiceVideoUsage,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function isHighRiskArticle(article: NewsDoc): boolean {
  const haystack = `${asString(article.categoryNameEn)} ${asString(article.categoryNameHi)} ${asString(article.titleEn)} ${asString(article.titleHi)} ${asString(article.summaryEn)} ${asString(article.summaryHi)}`.toLowerCase();
  const keywords = [
    "politic",
    "crime",
    "health",
    "finance",
    "religion",
    "legal",
    "election",
    "conflict",
    "violence",
    "death",
    "accident",
  ];
  return keywords.some((k) => haystack.includes(k));
}

export async function getTtsSettings(): Promise<TtsSettings> {
  const doc = await getAdminDb().collection("settings").doc(TTS_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_TTS_SETTINGS };
  return { ...DEFAULT_TTS_SETTINGS, ...(doc.data() as TtsSettings) };
}

export async function updateTtsSettings(patch: Partial<TtsSettings>): Promise<TtsSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(TTS_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_TTS_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  return getTtsSettings();
}

async function logVoiceVideo(entry: Omit<VoiceVideoLog, "id" | "createdAt">) {
  await getAdminDb().collection("voiceVideoLogs").add({ ...entry, createdAt: nowIso() });
}

export async function getVoiceVideoUsage(): Promise<VoiceVideoUsage> {
  const settings = await getTtsSettings();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
  const snap = await getAdminDb().collection("voiceVideoLogs").where("createdAt", ">=", monthStart).get();

  let dailyAudioCount = 0;
  let monthlyAudioCount = 0;
  let monthlyCost = 0;
  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.actionType === "audio_generation" && d.status === "success") {
      monthlyAudioCount += 1;
      monthlyCost += Number(d.estimatedCost || 0);
      if (String(d.createdAt || "") >= dayStart) dailyAudioCount += 1;
    }
  });

  return {
    dailyAudioCount,
    monthlyAudioCount,
    monthlyCost,
    dailyLimit: settings.dailyLimit,
    monthlyLimit: settings.monthlyLimit,
    limitExceeded: dailyAudioCount >= settings.dailyLimit || monthlyAudioCount >= settings.monthlyLimit,
  };
}

async function assertArticleConvertible(articleId: string): Promise<NewsDoc> {
  const articleRaw = await getArticleById(articleId);
  if (!articleRaw) throw new Error("Article not found");
  const article = articleRaw as NewsDoc;
  if (String(article.status || "") !== "published") {
    throw new Error("Only published articles can be converted");
  }
  return article;
}

function actionPrompt(action: VoiceScriptAction, article: NewsDoc, language: VoiceVideoLanguage): string {
  const title = language === "hi" ? asString(article.titleHi || article.titleEn) : asString(article.titleEn || article.titleHi);
  const summary = language === "hi" ? asString(article.summaryHi || article.summaryEn) : asString(article.summaryEn || article.summaryHi);
  const content = language === "hi" ? asString(article.contentHi || article.contentEn) : asString(article.contentEn || article.contentHi);
  const category = language === "hi" ? asString(article.categoryNameHi || article.categoryNameEn) : asString(article.categoryNameEn || article.categoryNameHi);
  const tags = Array.isArray(article.tags) ? (article.tags as string[]).join(", ") : "";

  return `
Generate "${action}" in ${language === "hi" ? "Hindi" : "English"}.
Article title: ${title}
Article summary: ${summary}
Article body: ${content.slice(0, 5000)}
Category: ${category}
Tags: ${tags}

Output constraints:
- Keep factual and neutral.
- Avoid clickbait and sensational words.
- Keep short lines for spoken delivery.
- No fabricated details.
- If unsure, stay generic and safe.

Return plain text only, no markdown.
`.trim();
}

export async function generateVoiceScript(args: {
  articleId: string;
  action: VoiceScriptAction;
  language: VoiceVideoLanguage;
  createdBy: string;
}) {
  const article = await assertArticleConvertible(args.articleId);
  const aiSettings = await getAISettings();
  const prompt = actionPrompt(args.action, article, args.language);
  const { text, tokensUsed } = await callAI(aiSettings, VOICE_VIDEO_SYSTEM_PROMPT, prompt);
  const cost = estimateCost(aiSettings.provider, tokensUsed);

  const requiresApproval = isHighRiskArticle(article);
  await logVoiceVideo({
    articleId: args.articleId,
    actionType: "script_generation",
    status: "success",
    provider: aiSettings.provider,
    inputPreview: prompt.slice(0, 300),
    outputPreview: text.slice(0, 300),
    tokensUsed,
    estimatedCost: cost,
    createdBy: args.createdBy,
  });
  return {
    script: text.trim(),
    tokensUsed,
    estimatedCost: cost,
    requiresApproval,
    highRisk: requiresApproval,
  };
}

async function uploadBuffer(path: string, buffer: Buffer, contentType: string): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, { contentType, resumable: false, metadata: { cacheControl: "public,max-age=31536000" } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

function estimatedDurationSeconds(script: string): number {
  const words = script.split(/\s+/).filter(Boolean).length;
  return Math.max(8, Math.ceil(words / 2.5));
}

async function generateAudioOpenAi(script: string, voice: string, speed: number): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice,
      input: script,
      format: "mp3",
      speed,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function generateAudio(args: {
  articleId: string;
  language: VoiceVideoLanguage;
  script: string;
  voice?: string;
  createdBy: string;
}) {
  await assertArticleConvertible(args.articleId);
  const usage = await getVoiceVideoUsage();
  if (usage.limitExceeded) {
    throw new Error("TTS generation paused: daily or monthly limit exceeded");
  }
  const ttsSettings = await getTtsSettings();
  const provider = ttsSettings.provider;
  const voice = args.voice || (args.language === "hi" ? ttsSettings.defaultHindiVoice : ttsSettings.defaultEnglishVoice);

  let audioBuffer: Buffer;
  if (provider === "openai_tts") {
    audioBuffer = await generateAudioOpenAi(args.script, voice, ttsSettings.speed);
  } else {
    throw new Error(`${provider} is configured as placeholder. Switch TTS provider to OpenAI TTS.`);
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `ai-voice-video/audio/${args.articleId}/${args.language}/${stamp}.mp3`;
  const audioUrl = await uploadBuffer(storagePath, audioBuffer, "audio/mpeg");
  const duration = estimatedDurationSeconds(args.script);
  const cost = Math.max(0.002, (args.script.length / 1000) * 0.015);
  const status: AudioAssetStatus = ttsSettings.requireApproval ? "generated" : "approved";

  const payload: Omit<AudioAsset, "id"> = {
    articleId: args.articleId,
    language: args.language,
    script: args.script,
    provider,
    voice,
    audioUrl,
    duration,
    status,
    cost,
    createdBy: args.createdBy,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("audioAssets").add(payload);
  await getAdminDb().collection("news").doc(args.articleId).set(
    args.language === "hi"
      ? { audioAssetHiId: ref.id, audioHiUrl: audioUrl, audioStatusHi: status, updatedAt: nowIso() }
      : { audioAssetEnId: ref.id, audioEnUrl: audioUrl, audioStatusEn: status, updatedAt: nowIso() },
    { merge: true }
  );

  await logVoiceVideo({
    articleId: args.articleId,
    actionType: "audio_generation",
    status: "success",
    provider,
    inputPreview: args.script.slice(0, 300),
    outputPreview: audioUrl,
    tokensUsed: estimateTokensFromText(args.script),
    estimatedCost: cost,
    createdBy: args.createdBy,
  });
  return { id: ref.id, ...payload };
}

function toTimestampSrt(sec: number): string {
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${ms}`;
}

function toTimestampVtt(sec: number): string {
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function buildSubtitleText(script: string, format: "srt" | "vtt"): string {
  const lines = script
    .split(/[.!?]\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 60);
  const perLine = 2.4;
  let out = format === "vtt" ? "WEBVTT\n\n" : "";
  lines.forEach((line, i) => {
    const start = i * perLine;
    const end = start + perLine;
    if (format === "srt") {
      out += `${i + 1}\n${toTimestampSrt(start)} --> ${toTimestampSrt(end)}\n${line}\n\n`;
    } else {
      out += `${i + 1}\n${toTimestampVtt(start)} --> ${toTimestampVtt(end)}\n${line}\n\n`;
    }
  });
  return out;
}

export async function generateSubtitles(args: {
  articleId: string;
  language: VoiceVideoLanguage;
  script: string;
  format: "srt" | "vtt";
  createdBy: string;
}) {
  await assertArticleConvertible(args.articleId);
  const subtitleText = buildSubtitleText(args.script, args.format);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = args.format === "srt" ? "srt" : "vtt";
  const storagePath = `ai-voice-video/subtitles/${args.articleId}/${args.language}/${stamp}.${ext}`;
  const subtitleUrl = await uploadBuffer(storagePath, Buffer.from(subtitleText, "utf8"), `text/${ext}`);
  const payload: Omit<SubtitleAsset, "id"> = {
    articleId: args.articleId,
    language: args.language,
    subtitleUrl,
    format: args.format,
    script: args.script,
    createdAt: nowIso(),
  };
  const ref = await getAdminDb().collection("subtitleAssets").add(payload);
  await logVoiceVideo({
    articleId: args.articleId,
    actionType: "subtitle_generation",
    status: "success",
    inputPreview: args.script.slice(0, 300),
    outputPreview: subtitleUrl,
    estimatedCost: 0,
    createdBy: args.createdBy,
  });
  return { id: ref.id, ...payload, content: subtitleText };
}

function buildScenes(script: string): VideoScene[] {
  const lines = script
    .split(/[.!?]\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
  return lines.map((line, idx) => ({
    index: idx + 1,
    startSec: idx * 5,
    endSec: idx * 5 + 5,
    line,
    visualSuggestion: `Use relevant factual visual for: ${line.slice(0, 90)}`,
  }));
}

export async function generateVideoPackage(args: {
  articleId: string;
  language: VoiceVideoLanguage;
  platform: VideoPlatform;
  script: string;
  audioAssetId?: string;
  subtitleUrl?: string;
  caption: string;
  hashtags: string[];
  createdBy: string;
}) {
  const article = await assertArticleConvertible(args.articleId);
  let thumbnailUrl = "";
  try {
    const assets = await generateMediaAsset({
      articleId: args.articleId,
      imageType: "open_graph",
      style: "editorial",
      language: args.language,
      createdBy: args.createdBy,
      customPrompt: `Thumbnail text context: ${args.script.slice(0, 160)}`,
      makeAlternatives: 1,
    });
    thumbnailUrl = assets[0]?.imageUrl || "";
  } catch {
    thumbnailUrl = asString(article.imageUrl);
  }

  const payload: Omit<VideoPackage, "id"> = {
    articleId: args.articleId,
    language: args.language,
    platform: args.platform,
    script: args.script,
    scenes: buildScenes(args.script),
    audioAssetId: args.audioAssetId,
    subtitleUrl: args.subtitleUrl,
    thumbnailUrl,
    caption: args.caption,
    hashtags: args.hashtags,
    status: "generated",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("videoPackages").add(payload);
  await logVoiceVideo({
    articleId: args.articleId,
    actionType: "video_package_generation",
    status: "success",
    outputPreview: JSON.stringify({ caption: args.caption, hashtags: args.hashtags }).slice(0, 280),
    estimatedCost: 0,
    createdBy: args.createdBy,
  });
  return { id: ref.id, ...payload };
}

export async function generateDigest(args: {
  digestType: "morning_bulletin" | "evening_bulletin" | "top5" | "category" | "breaking_recap";
  articleIds: string[];
  createdBy: string;
}) {
  const ids = args.articleIds.slice(0, 12);
  if (!ids.length) throw new Error("articleIds required");
  const docs = await Promise.all(ids.map((id) => assertArticleConvertible(id)));
  const hiLines = docs.map((a, i) => `${i + 1}. ${asString(a.titleHi || a.titleEn)} - ${asString(a.summaryHi || a.summaryEn)}`);
  const enLines = docs.map((a, i) => `${i + 1}. ${asString(a.titleEn || a.titleHi)} - ${asString(a.summaryEn || a.summaryHi)}`);
  const promptHi = `Create a concise Hindi ${args.digestType} script from:\n${hiLines.join("\n")}`;
  const promptEn = `Create a concise English ${args.digestType} script from:\n${enLines.join("\n")}`;
  const aiSettings = await getAISettings();
  const [hi, en] = await Promise.all([
    callAI(aiSettings, VOICE_VIDEO_SYSTEM_PROMPT, promptHi),
    callAI(aiSettings, VOICE_VIDEO_SYSTEM_PROMPT, promptEn),
  ]);

  const payload: Omit<NewsDigest, "id"> = {
    titleHi: `न्यूज जंक्शन ${args.digestType}`,
    titleEn: `News Junction ${args.digestType}`,
    articleIds: ids,
    scriptHi: hi.text.trim(),
    scriptEn: en.text.trim(),
    audioHiUrl: "",
    audioEnUrl: "",
    status: "generated",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("newsDigests").add(payload);
  await logVoiceVideo({
    digestId: ref.id,
    actionType: "digest_generation",
    status: "success",
    tokensUsed: hi.tokensUsed + en.tokensUsed,
    estimatedCost: estimateCost(aiSettings.provider, hi.tokensUsed + en.tokensUsed),
    createdBy: args.createdBy,
  });
  return { id: ref.id, ...payload };
}

export async function approveAudioVideo(args: {
  type: "audio" | "video_package" | "digest";
  id: string;
  action: "approve" | "reject" | "publish" | "save_draft";
  createdBy: string;
}) {
  const collectionName =
    args.type === "audio" ? "audioAssets" : args.type === "video_package" ? "videoPackages" : "newsDigests";
  const ref = getAdminDb().collection(collectionName).doc(args.id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Target item not found");
  const nextStatus =
    args.action === "approve"
      ? "approved"
      : args.action === "reject"
        ? "rejected"
        : args.action === "publish"
          ? "published"
          : "draft";
  await ref.update({ status: nextStatus, updatedAt: nowIso() });
  await logVoiceVideo({
    actionType: args.action === "reject" ? "rejection" : args.action === "publish" ? "publish" : "approval",
    status: "success",
    outputPreview: `${args.type}:${args.id}:${nextStatus}`,
    createdBy: args.createdBy,
  });
  return { success: true, status: nextStatus };
}

export async function getVoiceVideoStudioData() {
  const [settings, usage, logs, audioAssets, subtitles, packages, digests] = await Promise.all([
    getTtsSettings(),
    getVoiceVideoUsage(),
    getAdminDb().collection("voiceVideoLogs").orderBy("createdAt", "desc").limit(100).get(),
    getAdminDb().collection("audioAssets").orderBy("createdAt", "desc").limit(120).get(),
    getAdminDb().collection("subtitleAssets").orderBy("createdAt", "desc").limit(120).get(),
    getAdminDb().collection("videoPackages").orderBy("createdAt", "desc").limit(120).get(),
    getAdminDb().collection("newsDigests").orderBy("createdAt", "desc").limit(80).get(),
  ]);
  return {
    settings,
    usage,
    logs: logs.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    audioAssets: audioAssets.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    subtitleAssets: subtitles.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    videoPackages: packages.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    newsDigests: digests.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
  };
}
