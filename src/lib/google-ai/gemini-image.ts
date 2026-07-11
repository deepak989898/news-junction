import { GoogleGenAI } from "@google/genai";

/** Official Nano Banana 2 model — recommended generalist image model (Google AI docs, Jul 2026). */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

/** Legacy Imagen models are deprecated (shutdown 2026-08-17). Do not use. */
export const DEPRECATED_IMAGEN_MODELS = [
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-3.0-generate-002",
] as const;

/**
 * Google Gemini Developer API uses GEMINI_API_KEY.
 * IMAGEN_API_KEY is accepted only as a backward-compatible alias for older deployments.
 */
export function getGoogleImageApiKey(): string {
  return (process.env.GEMINI_API_KEY ?? process.env.IMAGEN_API_KEY ?? "").trim();
}

export function assertGoogleImageApiKey(): string {
  const key = getGoogleImageApiKey();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is required for Google Gemini image generation (IMAGEN_API_KEY is deprecated alias only)"
    );
  }
  return key;
}

type GeminiAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

type GeminiImageSize = "512" | "1K" | "2K" | "4K";

function mapSizeToGeminiFormat(size: string, quality: "standard" | "hd"): {
  aspectRatio: GeminiAspectRatio;
  imageSize: GeminiImageSize;
} {
  const [w, h] = size.split("x").map((v) => Number(v));
  if (!w || !h) {
    return { aspectRatio: "16:9", imageSize: quality === "hd" ? "2K" : "1K" };
  }

  const ratio = w / h;
  let aspectRatio: GeminiAspectRatio = "16:9";
  if (ratio > 1.6) aspectRatio = "16:9";
  else if (ratio < 0.65) aspectRatio = "9:16";
  else if (Math.abs(ratio - 1) < 0.12) aspectRatio = "1:1";
  else if (ratio > 1) aspectRatio = "3:2";
  else aspectRatio = "2:3";

  return { aspectRatio, imageSize: quality === "hd" ? "2K" : "1K" };
}

async function readImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    return { width: meta.width || 1024, height: meta.height || 1024 };
  } catch {
    return { width: 1024, height: 1024 };
  }
}

function extractImageBufferFromInteraction(interaction: {
  output_image?: { data?: string | null } | null;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; data?: string | null }>;
  }> | null;
}): Buffer | null {
  if (interaction.output_image?.data) {
    return Buffer.from(interaction.output_image.data, "base64");
  }

  for (const step of interaction.steps || []) {
    if (step.type !== "model_output") continue;
    for (const block of step.content || []) {
      if (block.type === "image" && block.data) {
        return Buffer.from(block.data, "base64");
      }
    }
  }

  return null;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Google Gemini image generation failed");
}

export async function generateGeminiImage(args: {
  prompt: string;
  size?: string;
  quality?: "standard" | "hd";
  model?: string;
}): Promise<{ imageBuffer: Buffer; format: string; width: number; height: number }> {
  const apiKey = assertGoogleImageApiKey();
  const model = args.model || DEFAULT_GEMINI_IMAGE_MODEL;

  if ((DEPRECATED_IMAGEN_MODELS as readonly string[]).includes(model)) {
    throw new Error(
      `Model ${model} is deprecated. Use ${DEFAULT_GEMINI_IMAGE_MODEL} via the Gemini Interactions API.`
    );
  }

  const { aspectRatio, imageSize } = mapSizeToGeminiFormat(args.size || "1536x1024", args.quality || "standard");
  const ai = new GoogleGenAI({ apiKey });

  const interaction = await withRetry(() =>
    ai.interactions.create({
      model,
      input: args.prompt,
      response_format: {
        type: "image",
        aspect_ratio: aspectRatio,
        image_size: imageSize,
      },
    })
  );

  const imageBuffer = extractImageBufferFromInteraction(interaction);
  if (!imageBuffer || imageBuffer.length < 100) {
    throw new Error("Google Gemini image generation returned no image data");
  }

  const { width, height } = await readImageDimensions(imageBuffer);
  return { imageBuffer, format: "png", width, height };
}
