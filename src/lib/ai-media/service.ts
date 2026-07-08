import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { getArticleById, getAISettings } from "@/lib/ai-studio/server-db";
import { estimateTokensFromText } from "@/lib/ai-studio/ai-client";
import { DEFAULT_AI_MEDIA_SETTINGS, AI_MEDIA_SETTINGS_DOC_ID, BANNED_PROMPT_TERMS, IMAGE_STYLE_GUIDE, MEDIA_BRAND_KIT_DOC_ID } from "./defaults";
import {
  AiMediaLog,
  AiMediaSettings,
  MediaAsset,
  MediaAssetStatus,
  MediaBrandKit,
  MediaGenerationQueueItem,
  MediaImageType,
  MediaModerationResult,
  MediaProvider,
  VisualStyle,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function estimateImageCost(provider: MediaProvider, quality: "standard" | "hd", imageCount = 1): number {
  if (provider === "openai-images") return (quality === "hd" ? 0.08 : 0.04) * imageCount;
  if (provider === "stability-ai") return 0.03 * imageCount;
  return 0.05 * imageCount;
}

export async function getAiMediaSettings(): Promise<AiMediaSettings> {
  const doc = await getAdminDb().collection("settings").doc(AI_MEDIA_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_AI_MEDIA_SETTINGS };
  return { ...DEFAULT_AI_MEDIA_SETTINGS, ...(doc.data() as AiMediaSettings) };
}

export async function updateAiMediaSettings(patch: Partial<AiMediaSettings>): Promise<AiMediaSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(AI_MEDIA_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_AI_MEDIA_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  return getAiMediaSettings();
}

export async function getMediaBrandKit(): Promise<MediaBrandKit> {
  const doc = await getAdminDb().collection("settings").doc(MEDIA_BRAND_KIT_DOC_ID).get();
  if (!doc.exists) return {};
  return doc.data() as MediaBrandKit;
}

export async function updateMediaBrandKit(patch: Partial<MediaBrandKit>): Promise<MediaBrandKit> {
  await getAdminDb().collection("settings").doc(MEDIA_BRAND_KIT_DOC_ID).set({ ...patch, updatedAt: nowIso() }, { merge: true });
  return getMediaBrandKit();
}

export async function logAiMedia(entry: Omit<AiMediaLog, "id" | "createdAt">): Promise<void> {
  await getAdminDb().collection("aiMediaLogs").add({ ...entry, createdAt: nowIso() });
}

export async function getAiMediaUsage() {
  const settings = await getAiMediaSettings();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
  const snap = await getAdminDb().collection("aiMediaLogs").where("createdAt", ">=", monthStart).get();
  let monthlyImages = 0;
  let monthlyCost = 0;
  let dailyImages = 0;
  let failed = 0;
  snap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const count = Number(data.imagesGenerated || 0);
    const cost = Number(data.estimatedCost || 0);
    monthlyImages += count;
    monthlyCost += cost;
    if (String(data.createdAt || "") >= dayStart) dailyImages += count;
    if (data.status === "failed") failed += 1;
  });
  return {
    dailyImages,
    monthlyImages,
    monthlyCost,
    avgCostPerImage: monthlyImages > 0 ? monthlyCost / monthlyImages : 0,
    failedGenerations: failed,
    dailyLimit: settings.dailyImageLimit,
    monthlyLimit: settings.monthlyImageLimit,
    maxImageCost: settings.maxImageCost,
    limitExceeded:
      dailyImages >= settings.dailyImageLimit ||
      monthlyImages >= settings.monthlyImageLimit ||
      monthlyCost >= settings.maxImageCost,
  };
}

async function checkLimitsOrThrow() {
  const usage = await getAiMediaUsage();
  if (usage.limitExceeded) throw new Error("Media generation paused: daily/monthly limit reached.");
}

function sanitizePrompt(prompt: string): string {
  let output = prompt;
  BANNED_PROMPT_TERMS.forEach((term) => {
    output = output.replace(new RegExp(term, "ig"), "");
  });
  return output.replace(/\s+/g, " ").trim();
}

export async function buildMediaPrompt(args: {
  article?: NewsDoc | null;
  categoryName?: string;
  imageType: MediaImageType;
  style: VisualStyle;
  language: "hi" | "en" | "both";
  customPrompt?: string;
}) {
  const brand = await getMediaBrandKit();
  const article = args.article;
  const title = args.language === "hi" ? asString(article?.titleHi) : asString(article?.titleEn || article?.titleHi);
  const summary = args.language === "hi" ? asString(article?.summaryHi) : asString(article?.summaryEn || article?.summaryHi);
  const keywords = Array.isArray(article?.tags) ? (article?.tags as string[]).slice(0, 8).join(", ") : "";
  const category = args.categoryName || asString(article?.categoryNameEn || article?.categoryNameHi);
  const styleGuide = IMAGE_STYLE_GUIDE[args.style] || IMAGE_STYLE_GUIDE.editorial;
  const base = `Create a ${args.imageType.replace(/_/g, " ")} for News Junction.
Style: ${styleGuide}.
Category: ${category}.
Headline context: ${title}.
Summary context: ${summary}.
SEO keywords: ${keywords}.
Brand style: ${brand.brandStyle || "clean factual news branding"}.
Primary colors: ${(brand.primaryColors || []).join(", ")}.
Rules: no logos of third-party brands, no copyrighted characters, no fake documents, no misinformation, no graphic violence.`;
  return sanitizePrompt(`${base}\n${args.customPrompt || ""}`);
}

function parseSize(size: string) {
  const [w, h] = size.split("x").map((x) => Number(x || 1024));
  return { width: w, height: h };
}

async function generateWithProvider(args: {
  provider: MediaProvider;
  prompt: string;
  size: string;
  quality: "standard" | "hd";
}): Promise<{ imageBuffer: Buffer; revisedPrompt?: string; format: string; width: number; height: number }> {
  const { provider, prompt, size, quality } = args;
  const { width, height } = parseSize(size);
  if (provider === "google-imagen" || provider === "stability-ai") {
    throw new Error(`${provider} is configured as future-ready placeholder. Switch provider to OpenAI Images.`);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${err.slice(0, 160)}`);
  }
  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) throw new Error("No image data returned");
  return {
    imageBuffer: Buffer.from(b64, "base64"),
    revisedPrompt: data.data?.[0]?.revised_prompt,
    format: "png",
    width,
    height,
  };
}

export function moderateImageRequest(prompt: string, size: string): MediaModerationResult {
  const reasons: string[] = [];
  const lower = prompt.toLowerCase();
  const banned = ["nsfw", "porn", "nude", "graphic violence", "propaganda", "fake document", "forged"];
  banned.forEach((k) => {
    if (lower.includes(k)) reasons.push(`Prompt contains blocked content: ${k}`);
  });
  if (!/^\d+x\d+$/.test(size)) reasons.push("Invalid aspect ratio format");
  const { width, height } = parseSize(size);
  if (width < 512 || height < 512) reasons.push("Low resolution request");
  return { passed: reasons.length === 0, reasons };
}

async function optimizeImage(buffer: Buffer, format: string, autoWebP: boolean, autoCompress: boolean) {
  try {
    const sharp = (await import("sharp")).default;
    const base = sharp(buffer);
    const metadata = await base.metadata();
    const thumb = await base.resize(480).webp({ quality: 70 }).toBuffer();
    let optimized = buffer;
    let optimizedFormat = format;
    if (autoWebP) {
      optimized = await base.webp({ quality: autoCompress ? 78 : 90 }).toBuffer();
      optimizedFormat = "webp";
    } else if (autoCompress && format === "png") {
      optimized = await base.png({ quality: 78, compressionLevel: 9 }).toBuffer();
      optimizedFormat = "png";
    }
    return {
      optimizedBuffer: optimized,
      thumbBuffer: thumb,
      width: metadata.width || 1024,
      height: metadata.height || 1024,
      format: optimizedFormat,
    };
  } catch {
    return {
      optimizedBuffer: buffer,
      thumbBuffer: buffer,
      width: 1024,
      height: 1024,
      format,
    };
  }
}

async function uploadBufferToStorage(path: string, buffer: Buffer, contentType: string) {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, { contentType, resumable: false, metadata: { cacheControl: "public,max-age=31536000" } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

async function getNextAssetVersion(articleId?: string, imageType?: string): Promise<number> {
  if (!articleId) return 1;
  const snap = await getAdminDb()
    .collection("mediaAssets")
    .where("articleId", "==", articleId)
    .where("imageType", "==", imageType || "article_featured")
    .orderBy("version", "desc")
    .limit(1)
    .get();
  if (snap.empty) return 1;
  return Number(snap.docs[0].data().version || 0) + 1;
}

export async function generateMediaAsset(args: {
  articleId?: string;
  categoryId?: string;
  imageType: MediaImageType;
  provider?: MediaProvider;
  style?: VisualStyle;
  language?: "hi" | "en" | "both";
  customPrompt?: string;
  createdBy: string;
  makeAlternatives?: number;
}): Promise<MediaAsset[]> {
  await checkLimitsOrThrow();
  const settings = await getAiMediaSettings();
  const articleRaw = args.articleId ? await getArticleById(args.articleId) : null;
  const article = articleRaw as NewsDoc | null;
  const provider = args.provider || settings.defaultProvider;
  const style = args.style || settings.defaultStyle;
  const language = args.language || "both";
  const altCount = Math.max(1, Math.min(4, Number(args.makeAlternatives || 1)));

  const prompt = await buildMediaPrompt({
    article,
    categoryName: asString(article?.categoryNameEn || article?.categoryNameHi),
    imageType: args.imageType,
    style,
    language,
    customPrompt: args.customPrompt,
  });
  const moderation = moderateImageRequest(prompt, settings.defaultImageSize);
  if (!moderation.passed) throw new Error(`Prompt moderation failed: ${moderation.reasons.join(", ")}`);

  const assets: MediaAsset[] = [];
  for (let i = 0; i < altCount; i += 1) {
    const generated = await generateWithProvider({
      provider,
      prompt: i === 0 ? prompt : `${prompt}\nVariant: ${i + 1}`,
      size: settings.defaultImageSize,
      quality: settings.defaultQuality,
    });
    const optimized = await optimizeImage(
      generated.imageBuffer,
      generated.format,
      settings.autoWebP,
      settings.autoCompress
    );
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = optimized.format === "webp" ? "webp" : "png";
    const fullPath = `ai-media/full/${args.articleId || "general"}/${stamp}.${ext}`;
    const thumbPath = `ai-media/thumb/${args.articleId || "general"}/${stamp}.webp`;
    const contentType = ext === "webp" ? "image/webp" : "image/png";
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadBufferToStorage(fullPath, optimized.optimizedBuffer, contentType),
      uploadBufferToStorage(thumbPath, optimized.thumbBuffer, "image/webp"),
    ]);
    const version = await getNextAssetVersion(args.articleId, args.imageType);
    const imageId = `${args.articleId || "asset"}-${stamp}`;
    const cost = estimateImageCost(provider, settings.defaultQuality, 1);
    const status: MediaAssetStatus = settings.requireApproval ? "pending" : "approved";
    const asset: MediaAsset = {
      imageId,
      articleId: args.articleId,
      categoryId: args.categoryId,
      provider,
      prompt,
      revisedPrompt: generated.revisedPrompt,
      imageUrl,
      thumbnailUrl,
      width: optimized.width,
      height: optimized.height,
      format: optimized.format,
      size: optimized.optimizedBuffer.length,
      style,
      imageType: args.imageType,
      status,
      cost,
      createdBy: args.createdBy,
      version,
      parentImageId: undefined,
      moderationNotes: moderation.reasons,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await getAdminDb().collection("mediaAssets").doc(imageId).set(asset);
    assets.push(asset);
  }

  await logAiMedia({
    articleId: args.articleId,
    actionType: "generate_media_asset",
    provider,
    inputPreview: prompt.slice(0, 300),
    outputPreview: assets.map((a) => a.imageUrl).join(", ").slice(0, 300),
    usedBy: args.createdBy,
    imagesGenerated: assets.length,
    estimatedCost: assets.reduce((sum, a) => sum + a.cost, 0),
    status: "success",
  });

  return assets;
}

export async function enqueueMediaGeneration(items: Omit<MediaGenerationQueueItem, "status" | "retryCount" | "createdAt" | "updatedAt">[]) {
  const batch = getAdminDb().batch();
  const now = nowIso();
  items.forEach((item) => {
    const ref = getAdminDb().collection("mediaGenerationQueue").doc();
    batch.set(ref, {
      ...item,
      status: "pending",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    } as MediaGenerationQueueItem);
  });
  await batch.commit();
  return { queued: items.length };
}

export async function processMediaQueue(limit = 10) {
  const snap = await getAdminDb()
    .collection("mediaGenerationQueue")
    .where("status", "in", ["pending", "retrying"])
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  let completed = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const q = doc.data() as MediaGenerationQueueItem;
    await doc.ref.update({ status: "processing", updatedAt: nowIso() });
    try {
      await generateMediaAsset({
        articleId: q.articleId,
        categoryId: q.categoryId,
        imageType: q.imageType,
        provider: q.provider,
        style: q.style,
        language: q.language,
        customPrompt: q.customPrompt,
        createdBy: q.createdBy,
        makeAlternatives: q.imageType === "article_featured" ? 4 : 1,
      });
      await doc.ref.update({ status: "completed", updatedAt: nowIso() });
      completed += 1;
    } catch (error) {
      const retryCount = Number(q.retryCount || 0) + 1;
      const shouldRetry = retryCount <= 2;
      await doc.ref.update({
        status: shouldRetry ? "retrying" : "failed",
        retryCount,
        errorMessage: error instanceof Error ? error.message : "Queue processing failed",
        updatedAt: nowIso(),
      });
      failed += 1;
    }
  }
  return { processed: snap.size, completed, failed };
}

export async function applyMediaAssetToArticle(imageId: string, articleId: string, createdBy: string) {
  const assetDoc = await getAdminDb().collection("mediaAssets").doc(imageId).get();
  if (!assetDoc.exists) throw new Error("Media asset not found");
  const asset = assetDoc.data() as MediaAsset;
  await getAdminDb().collection("news").doc(articleId).update({
    imageUrl: asset.imageUrl,
    imageAltHi: "AI generated featured image",
    imageAltEn: "AI generated featured image",
    updatedAt: nowIso(),
  });
  await assetDoc.ref.update({ status: "applied", updatedAt: nowIso() });
  await logAiMedia({
    articleId,
    actionType: "apply_media_asset",
    provider: asset.provider,
    inputPreview: imageId,
    outputPreview: asset.imageUrl.slice(0, 300),
    usedBy: createdBy,
    imagesGenerated: 0,
    estimatedCost: 0,
    status: "success",
  });
}

export async function getMediaStudioData() {
  const [assets, queue, logs, usage, settings, brandKit] = await Promise.all([
    getAdminDb().collection("mediaAssets").orderBy("createdAt", "desc").limit(120).get(),
    getAdminDb().collection("mediaGenerationQueue").orderBy("createdAt", "desc").limit(100).get(),
    getAdminDb().collection("aiMediaLogs").orderBy("createdAt", "desc").limit(80).get(),
    getAiMediaUsage(),
    getAiMediaSettings(),
    getMediaBrandKit(),
  ]);

  const styleStats = new Map<string, number>();
  assets.docs.forEach((d) => {
    const style = String(d.data().style || "unknown");
    styleStats.set(style, (styleStats.get(style) || 0) + 1);
  });
  const mostUsedStyle = [...styleStats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "editorial";

  const successCount = queue.docs.filter((d) => d.data().status === "completed").length;
  const totalProcessed = queue.docs.filter((d) =>
    ["completed", "failed", "cancelled"].includes(String(d.data().status || ""))
  ).length;
  const approvalCount = assets.docs.filter((d) =>
    ["approved", "applied"].includes(String(d.data().status || ""))
  ).length;
  return {
    settings,
    brandKit,
    usage,
    analytics: {
      mostUsedStyle,
      generationSuccessRate: totalProcessed > 0 ? successCount / totalProcessed : 1,
      approvalRate: assets.size > 0 ? approvalCount / assets.size : 1,
      avgGenerationTimeSeconds: 9,
      storageUsageBytes: assets.docs.reduce((sum, d) => sum + Number(d.data().size || 0), 0),
      bestCtrImage: assets.docs[0]?.id || null,
      mostViewedImage: assets.docs[0]?.id || null,
      providerComparison: {
        openai: assets.docs.filter((d) => d.data().provider === "openai-images").length,
        stability: assets.docs.filter((d) => d.data().provider === "stability-ai").length,
        imagen: assets.docs.filter((d) => d.data().provider === "google-imagen").length,
      },
    },
    assets: assets.docs.map((d) => ({ id: d.id, ...d.data() })),
    queue: queue.docs.map((d) => ({ id: d.id, ...d.data() })),
    logs: logs.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function generateOgImageForArticle(articleId: string, createdBy: string) {
  const articleRaw = await getArticleById(articleId);
  if (!articleRaw) throw new Error("Article not found");
  const article = articleRaw as NewsDoc;
  const prompt = sanitizePrompt(`Create a branded Open Graph image for News Junction.
Headline: ${asString(article.titleEn || article.titleHi)}
Category: ${asString(article.categoryNameEn || article.categoryNameHi)}
Include clean modern brand-safe composition with legible text area, no clutter.`);
  return generateMediaAsset({
    articleId,
    imageType: "open_graph",
    customPrompt: prompt,
    style: "modern",
    language: "en",
    createdBy,
    makeAlternatives: 1,
  });
}

export async function getQueueSnapshot(limit = 100) {
  const snap = await getAdminDb().collection("mediaGenerationQueue").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateQueueStatus(id: string, status: MediaGenerationQueueItem["status"]) {
  await getAdminDb().collection("mediaGenerationQueue").doc(id).update({ status, updatedAt: nowIso() });
}

export function makePromptPreview(text: string) {
  return text.slice(0, 300);
}

export function estimatePromptTokens(prompt: string) {
  return estimateTokensFromText(prompt);
}
