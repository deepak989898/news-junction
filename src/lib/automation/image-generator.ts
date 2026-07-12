import { getAdminStorage } from "@/lib/firebase-admin";
import {
  buildFirebaseStorageDownloadUrl,
  createStorageDownloadToken,
  isFirebaseStorageUrl,
} from "@/lib/firebase-storage-url";

const NEWS_IMAGE_WIDTH = 1200;
const NEWS_IMAGE_HEIGHT = 675;
const WEBP_QUALITY = 86;

const CATEGORY_VISUAL_STYLE: Record<string, string> = {
  khel: "dynamic sports action in a stadium or field, athletes in motion, energetic atmosphere",
  technology: "modern technology scene — devices, innovation lab, or digital infrastructure",
  vyapar: "business district skyline, stock market floor, or corporate editorial scene",
  swasthya: "clean hospital, medical research, or public health setting",
  manoranjan: "entertainment event, cinema, music, or cultural celebration scene",
  duniya: "international landmark or global news location matching the story region",
  rajya: "Indian state landmark, government building, or regional civic scene",
  desh: "Indian national context — parliament area, major city skyline, or civic life",
  video: "broadcast news studio or media production environment",
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

function isUsableFirebaseImageUrl(url: string): boolean {
  return isFirebaseStorageUrl(url) && url.includes("firebasestorage.googleapis.com") && url.includes("token=");
}

function extractVisualKeywords(titleEn: string, summaryEn: string): string {
  const combined = `${titleEn} ${summaryEn}`.toLowerCase();
  const cues: string[] = [];

  if (/court|verdict|judge|legal|petition|law/i.test(combined)) cues.push("courtroom or legal proceedings setting");
  if (/election|vote|politic|parliament|minister|government/i.test(combined)) cues.push("political or government setting");
  if (/cricket|football|sport|match|olympic|player/i.test(combined)) cues.push("sports action scene");
  if (/tech|ai|software|smartphone|digital|cyber/i.test(combined)) cues.push("technology and innovation scene");
  if (/health|hospital|doctor|disease|medical/i.test(combined)) cues.push("healthcare environment");
  if (/economy|market|stock|business|trade|rupee/i.test(combined)) cues.push("business and economy scene");
  if (/weather|flood|storm|earthquake|disaster/i.test(combined)) cues.push("weather or disaster scene");
  if (/school|education|student|university/i.test(combined)) cues.push("education campus scene");
  if (/police|crime|arrest|investigation/i.test(combined)) cues.push("law enforcement scene without violence");
  if (/space|nasa|rocket|satellite/i.test(combined)) cues.push("space or aerospace scene");

  return cues.length ? cues.join("; ") : "clear symbolic scene that represents the headline topic";
}

function buildImagePrompt(params: {
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
}): string {
  const style = CATEGORY_VISUAL_STYLE[params.categoryId] || "editorial news photography";
  const summary = params.summaryEn.replace(/\s+/g, " ").slice(0, 320);
  const visualCues = extractVisualKeywords(params.titleEn, params.summaryEn);

  return `Photorealistic featured news photograph for a Hindi-English news website.

The image MUST instantly communicate this story to a viewer within 2 seconds.

English headline: ${params.titleEn}
Hindi headline: ${params.titleHi}
Story summary: ${summary}
Category: ${params.categoryNameEn}
Visual cues to include: ${visualCues}
Category style: ${style}

Composition requirements:
- 16:9 wide landscape, hero image suitable for mobile and desktop news cards
- Single clear focal subject related to the headline (place, event, object, or symbolic scene)
- Professional Reuters/AP-style photojournalism, natural lighting, sharp focus, rich color
- Center-weighted subject so cropping on mobile still reads clearly
- Realistic environment matching the news topic and geography when implied

Strict exclusions: no text, no captions, no logos, no watermarks, no brand marks, no readable signs, no identifiable real person's face, no gore, no propaganda, no collage, no split panels.`;
}

async function optimizeForWeb(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const optimized = await sharp(buffer)
      .rotate()
      .resize(NEWS_IMAGE_WIDTH, NEWS_IMAGE_HEIGHT, {
        fit: "cover",
        position: "attention",
        kernel: sharp.kernel.lanczos3,
      })
      .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
      .toBuffer();
    return { buffer: optimized, contentType: "image/webp", ext: "webp" };
  } catch {
    return { buffer, contentType: "image/png", ext: "png" };
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
        width: String(NEWS_IMAGE_WIDTH),
        height: String(NEWS_IMAGE_HEIGHT),
        aspectRatio: "16:9",
      },
    },
  });

  return buildFirebaseStorageDownloadUrl(bucket.name, path, downloadToken);
}

async function optimizeAndUpload(rawNewsId: string, sourceBuffer: Buffer): Promise<string> {
  const optimized = await optimizeForWeb(sourceBuffer);
  return uploadOptimizedImage(rawNewsId, optimized.buffer, optimized.contentType, optimized.ext);
}

async function fetchSourceImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: new URL(url).origin,
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/") && contentType !== "application/octet-stream") {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1500) return null;
    if (arrayBuffer.byteLength > 8_000_000) return null;

    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function hostSourceImageOnFirebase(
  rawNewsId: string,
  sourceUrl: string
): Promise<string | null> {
  const sourceBuffer = await fetchSourceImageBuffer(sourceUrl);
  if (!sourceBuffer) return null;
  return optimizeAndUpload(rawNewsId, sourceBuffer);
}

export async function generateAutomationArticleImage(params: {
  rawNewsId: string;
  titleEn: string;
  titleHi: string;
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
}): Promise<{ imageUrl: string; generated: boolean; source: "cached" | "ai" | "hosted" | "fallback" }> {
  if (isUsableFirebaseImageUrl(params.generatedImageUrl || "")) {
    return { imageUrl: params.generatedImageUrl!, generated: true, source: "cached" };
  }

  if (params.generateAiImages) {
    try {
      const generated = await generateAutomationArticleImage({
        rawNewsId: params.rawNewsId,
        titleEn: params.titleEn || params.titleHi,
        titleHi: params.titleHi || params.titleEn,
        summaryEn: params.summaryEn,
        categoryId: params.categoryId,
        categoryNameEn: params.categoryNameEn,
      });
      if (generated && isUsableFirebaseImageUrl(generated)) {
        return { imageUrl: generated, generated: true, source: "ai" };
      }
    } catch {
      // Continue to hosted source image.
    }
  }

  if (isSafeImageUrl(params.originalImage)) {
    const hosted = await hostSourceImageOnFirebase(params.rawNewsId, params.originalImage);
    if (hosted) {
      return { imageUrl: hosted, generated: true, source: "hosted" };
    }
  }

  return { imageUrl: params.fallbackImage, generated: false, source: "fallback" };
}
