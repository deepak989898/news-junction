import { getAdminStorage } from "@/lib/firebase-admin";
import {
  buildFirebaseStorageDownloadUrl,
  createStorageDownloadToken,
} from "@/lib/firebase-storage-url";

const NEWS_IMAGE_WIDTH = 1200;
const NEWS_IMAGE_HEIGHT = 675;
const WEBP_QUALITY = 76;
const MIN_SOURCE_IMAGE_BYTES = 12_000;
const MIN_SOURCE_IMAGE_WIDTH = 480;

const CATEGORY_VISUAL_STYLE: Record<string, string> = {
  khel: "dynamic sports action, stadium or field atmosphere",
  technology: "clean modern technology, devices or innovation lab",
  vyapar: "business district, markets, or corporate editorial scene",
  swasthya: "healthcare and wellness editorial environment",
  manoranjan: "entertainment and culture scene",
  duniya: "international news location or global context",
  rajya: "Indian state landmark or civic scene",
  desh: "Indian national news editorial scene",
  video: "broadcast studio or media production",
};

function isSafeImageUrl(url: string): boolean {
  if (!url || url === "/logo.png") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildImagePrompt(params: {
  titleEn: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
}): string {
  const style = CATEGORY_VISUAL_STYLE[params.categoryId] || "editorial news photography";
  const summary = params.summaryEn.replace(/\s+/g, " ").slice(0, 240);
  return `Professional 16:9 landscape featured image for a news website article.
Topic: ${params.titleEn}
Context: ${summary}
Category: ${params.categoryNameEn}
Style: ${style}, photorealistic, sharp focus, balanced composition, natural colors, cinematic lighting.
Requirements: wide landscape framing, high visual clarity, realistic scene symbolic of the story, suitable as a news hero image.
Strict exclusions: no text, no captions, no logos, no watermarks, no brand marks, no identifiable real person's face, no gore, no propaganda.`;
}

async function optimizeForWeb(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(buffer)
      .rotate()
      .resize(NEWS_IMAGE_WIDTH, NEWS_IMAGE_HEIGHT, {
        fit: "cover",
        position: "attention",
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    return { buffer: optimized, contentType: "image/webp", ext: "webp" };
  } catch {
    return { buffer, contentType: "image/png", ext: "png" };
  }
}

async function getImageMeta(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

async function uploadOptimizedImage(
  rawNewsId: string,
  buffer: Buffer,
  contentType: string,
  ext: string
): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const path = `news/automation/${rawNewsId}/${Date.now()}.${ext}`;
  const file = bucket.file(path);
  const downloadToken = createStorageDownloadToken();

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  return buildFirebaseStorageDownloadUrl(bucket.name, path, downloadToken);
}

async function fetchSourceImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "NewsJunctionBot/1.0" },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < MIN_SOURCE_IMAGE_BYTES) return null;
    if (arrayBuffer.byteLength > 6_000_000) return null;

    const buffer = Buffer.from(arrayBuffer);
    const meta = await getImageMeta(buffer);
    if (!meta || meta.width < MIN_SOURCE_IMAGE_WIDTH) return null;

    return buffer;
  } catch {
    return null;
  }
}

async function optimizeAndUpload(rawNewsId: string, sourceBuffer: Buffer): Promise<string> {
  const optimized = await optimizeForWeb(sourceBuffer);
  return uploadOptimizedImage(rawNewsId, optimized.buffer, optimized.contentType, optimized.ext);
}

export async function generateAutomationArticleImage(params: {
  rawNewsId: string;
  titleEn: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildImagePrompt(params);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "high",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${err.slice(0, 180)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) return null;

  const rawBuffer = Buffer.from(b64, "base64");
  return optimizeAndUpload(params.rawNewsId, rawBuffer);
}

async function tryOptimizeSourceImage(rawNewsId: string, sourceUrl: string): Promise<string | null> {
  const sourceBuffer = await fetchSourceImageBuffer(sourceUrl);
  if (!sourceBuffer) return null;
  return optimizeAndUpload(rawNewsId, sourceBuffer);
}

export async function resolveAutomationArticleImage(params: {
  rawNewsId: string;
  originalImage: string;
  generatedImageUrl?: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
  fallbackImage: string;
  generateAiImages: boolean;
}): Promise<{ imageUrl: string; generated: boolean }> {
  if (isSafeImageUrl(params.generatedImageUrl || "")) {
    return { imageUrl: params.generatedImageUrl!, generated: true };
  }

  if (params.generateAiImages) {
    try {
      const generated = await generateAutomationArticleImage({
        rawNewsId: params.rawNewsId,
        titleEn: params.titleEn || params.titleHi,
        summaryEn: params.summaryEn,
        categoryId: params.categoryId,
        categoryNameEn: params.categoryNameEn,
      });
      if (generated) {
        return { imageUrl: generated, generated: true };
      }
    } catch {
      // Fall through to optimized source image.
    }
  }

  if (isSafeImageUrl(params.originalImage)) {
    try {
      const optimizedSource = await tryOptimizeSourceImage(params.rawNewsId, params.originalImage);
      if (optimizedSource) {
        return { imageUrl: optimizedSource, generated: true };
      }
    } catch {
      // Fall through to raw source or default.
    }
    return { imageUrl: params.originalImage, generated: false };
  }

  return { imageUrl: params.fallbackImage, generated: false };
}
