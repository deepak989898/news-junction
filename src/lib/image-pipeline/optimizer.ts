import { getAdminStorage } from "@/lib/firebase-admin";
import {
  buildFirebaseStorageDownloadUrl,
  createStorageDownloadToken,
  isFirebaseStorageUrl,
} from "@/lib/firebase-storage-url";
import { ImageVariantUrls } from "./types";
import { hashImageBuffer } from "./source-fetcher";
import {
  MIN_SOURCE_HEIGHT,
  MIN_SOURCE_WIDTH,
  VARIANT_SIZES,
  WEBP_QUALITY,
} from "./quality-config";

export { VARIANT_SIZES, WEBP_QUALITY, MIN_SOURCE_WIDTH, MIN_SOURCE_HEIGHT };

export function isUsableFirebaseImageUrl(url: string): boolean {
  return isFirebaseStorageUrl(url) && url.includes("firebasestorage.googleapis.com") && url.includes("token=");
}

async function getSharp() {
  return (await import("sharp")).default;
}

/** Reject tiny RSS thumbnails that would look blurry when displayed */
export function isSourceLargeEnough(width: number, height: number): boolean {
  return width >= MIN_SOURCE_WIDTH && height >= MIN_SOURCE_HEIGHT;
}

/**
 * Enhance contrast, saturation and brightness before resize/compress.
 * OpenAI news images often come out underexposed/moody — lift them for cards.
 */
export async function enhanceForNewsDisplay(buffer: Buffer): Promise<Buffer> {
  const sharp = await getSharp();
  return sharp(buffer)
    .rotate()
    .normalize()
    .modulate({ saturation: 1.1, brightness: 1.18 })
    .gamma(1.05)
    .sharpen({ sigma: 1.05, m1: 0.75, m2: 0.4, x1: 2, y2: 10, y3: 20 })
    .toBuffer();
}

export async function measureImageQuality(buffer: Buffer): Promise<{
  width: number;
  height: number;
  clarityScore: number;
  qualityScore: number;
}> {
  try {
    const sharp = await getSharp();
    const image = sharp(buffer);
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    const stats = await image.stats();
    const avgStdDev =
      stats.channels.reduce((sum, ch) => sum + (ch.stdev || 0), 0) / Math.max(stats.channels.length, 1);

    let clarityScore = Math.min(100, Math.round(avgStdDev * 4.5));
    let qualityScore = 50;

    if (width >= 1536 && height >= 1024) qualityScore += 35;
    else if (width >= 1536 && height >= 864) qualityScore += 32;
    else if (width >= 1200 && height >= 675) qualityScore += 30;
    else if (width >= 960 && height >= 540) qualityScore += 22;
    else if (width >= MIN_SOURCE_WIDTH && height >= MIN_SOURCE_HEIGHT) qualityScore += 12;
    else qualityScore -= 25;

    if (width < 480 || height < 270) qualityScore -= 35;

    qualityScore = Math.max(0, Math.min(100, qualityScore));
    clarityScore = Math.max(0, Math.min(100, clarityScore));

    return { width, height, clarityScore, qualityScore };
  } catch {
    return { width: 0, height: 0, clarityScore: 40, qualityScore: 40 };
  }
}

function pickLargeDimensions(sourceWidth: number): { width: number; height: number } {
  // Keep 3:2 (OpenAI landscape) so hero subjects are not cropped to 16:9.
  const ratio = 2 / 3; // height / width for 3:2
  if (sourceWidth >= VARIANT_SIZES.large.width) {
    return VARIANT_SIZES.large;
  }
  if (sourceWidth >= 1200) {
    return { width: 1200, height: Math.round(1200 * ratio) };
  }
  if (sourceWidth >= MIN_SOURCE_WIDTH) {
    return {
      width: sourceWidth,
      height: Math.max(MIN_SOURCE_HEIGHT, Math.round(sourceWidth * ratio)),
    };
  }
  return VARIANT_SIZES.large;
}

async function resizeVariant(
  buffer: Buffer,
  width: number,
  height: number,
  quality: number,
  focalPoint?: { x: number; y: number },
  /** Hero/large: prefer "inside" so we never crop the generated frame. Cards keep "cover". */
  fit: "cover" | "inside" = "cover"
): Promise<Buffer> {
  const sharp = await getSharp();
  const position = focalPoint
    ? `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%`
    : "attention";

  const meta = await sharp(buffer).metadata();
  const sourceW = meta.width || width;
  const sourceH = meta.height || height;

  let pipeline = sharp(buffer).rotate();

  const needsUpscale = sourceW < width || sourceH < height;
  pipeline = pipeline.resize(width, height, {
    fit,
    position: fit === "cover" ? position : "centre",
    kernel: sharp.kernel.lanczos3,
    withoutEnlargement: needsUpscale && fit === "cover",
  });

  return pipeline
    .webp({ quality, effort: 6, smartSubsample: false, nearLossless: quality >= 92 })
    .toBuffer();
}

async function uploadVariant(
  storagePath: string,
  buffer: Buffer,
  meta: Record<string, string>
): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);
  const downloadToken = createStorageDownloadToken();

  await file.save(buffer, {
    contentType: "image/webp",
    resumable: false,
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        ...meta,
      },
    },
  });

  return buildFirebaseStorageDownloadUrl(bucket.name, storagePath, downloadToken);
}

export async function optimizeAndUploadVariants(
  articleStorageId: string,
  sourceBuffer: Buffer,
  focalPoint?: { x: number; y: number }
): Promise<{ variants: ImageVariantUrls; fileHash: string; qualityScore: number; clarityScore: number }> {
  const fileHash = hashImageBuffer(sourceBuffer);
  const enhanced = await enhanceForNewsDisplay(sourceBuffer);
  const measured = await measureImageQuality(enhanced);
  const ts = Date.now();
  const basePath = `news/images/${articleStorageId}/${ts}`;

  const largeDims = pickLargeDimensions(measured.width);

  const [large, medium, thumbnail] = await Promise.all([
    // Large/hero: fit "inside" — keep full generated frame (no subject crop).
    resizeVariant(enhanced, largeDims.width, largeDims.height, WEBP_QUALITY.large, focalPoint, "inside"),
    resizeVariant(enhanced, VARIANT_SIZES.medium.width, VARIANT_SIZES.medium.height, WEBP_QUALITY.medium, focalPoint, "cover"),
    resizeVariant(enhanced, VARIANT_SIZES.thumbnail.width, VARIANT_SIZES.thumbnail.height, WEBP_QUALITY.thumbnail, focalPoint, "cover"),
  ]);

  const [largeUrl, mediumUrl, thumbUrl] = await Promise.all([
    uploadVariant(`${basePath}/large.webp`, large, {
      width: String(largeDims.width),
      height: String(largeDims.height),
      variant: "large",
    }),
    uploadVariant(`${basePath}/medium.webp`, medium, {
      width: String(VARIANT_SIZES.medium.width),
      height: String(VARIANT_SIZES.medium.height),
      variant: "medium",
    }),
    uploadVariant(`${basePath}/thumb.webp`, thumbnail, {
      width: String(VARIANT_SIZES.thumbnail.width),
      height: String(VARIANT_SIZES.thumbnail.height),
      variant: "thumbnail",
    }),
  ]);

  // Keep Media Library in sync with generated pipeline images
  void registerPipelineImageInLibrary({
    url: largeUrl,
    articleId: articleStorageId,
    filename: `${articleStorageId}-${ts}-large.webp`,
    origin: "image-pipeline",
  });

  return {
    variants: {
      large: largeUrl,
      medium: mediumUrl,
      thumbnail: thumbUrl,
      webp: largeUrl,
    },
    fileHash,
    qualityScore: measured.qualityScore,
    clarityScore: measured.clarityScore,
  };
}

/** Register pipeline image into Media Library (call after optimizeAndUploadVariants). */
export async function registerPipelineImageInLibrary(args: {
  url: string;
  articleId: string;
  filename?: string;
  altHi?: string;
  altEn?: string;
  origin?: string;
}) {
  try {
    const { upsertMediaLibraryEntry } = await import("@/lib/media-library/service");
    await upsertMediaLibraryEntry({
      url: args.url,
      filename: args.filename || `article-${args.articleId}`,
      altHi: args.altHi,
      altEn: args.altEn,
      uploadedBy: args.origin || "image-pipeline",
      source: "article_pipeline",
      articleId: args.articleId,
      contentType: "image/webp",
    });
  } catch {
    /* non-fatal */
  }
}

/** Backward-compatible single upload used by legacy callers */
export async function optimizeAndUploadSingle(
  articleStorageId: string,
  sourceBuffer: Buffer
): Promise<string> {
  const result = await optimizeAndUploadVariants(articleStorageId, sourceBuffer);
  return result.variants.large;
}
