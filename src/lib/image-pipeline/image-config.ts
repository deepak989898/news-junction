import "server-only";

/** Env-driven OpenAI image generation config (server-side only). */
export type OpenAiImageConfig = {
  enabled: boolean;
  model: string;
  fallbackModel: string;
  quality: "low" | "medium" | "high";
  size: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  maxAttempts: number;
  textOverlayEnabled: boolean;
  autoGeneration: boolean;
};

function asQuality(raw: string | undefined): OpenAiImageConfig["quality"] {
  const value = String(raw || "high").toLowerCase();
  if (value === "low" || value === "medium" || value === "high") return value;
  // Legacy Media Studio values
  if (value === "hd" || value === "standard") return value === "hd" ? "high" : "medium";
  return "high";
}

function asSize(raw: string | undefined): OpenAiImageConfig["size"] {
  const value = String(raw || "1536x1024");
  if (value === "1024x1024" || value === "1536x1024" || value === "1024x1536" || value === "auto") {
    return value;
  }
  return "1536x1024";
}

export function getOpenAiImageConfig(): OpenAiImageConfig {
  return {
    enabled: process.env.OPENAI_IMAGE_ENABLED !== "false",
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    fallbackModel: process.env.OPENAI_IMAGE_FALLBACK_MODEL || "gpt-image-1",
    quality: asQuality(process.env.OPENAI_IMAGE_QUALITY),
    size: asSize(process.env.OPENAI_IMAGE_SIZE),
    maxAttempts: Math.max(1, Math.min(3, Number(process.env.OPENAI_IMAGE_MAX_ATTEMPTS || 2))),
    textOverlayEnabled: process.env.NEWS_IMAGE_TEXT_OVERLAY_ENABLED !== "false",
    autoGeneration: process.env.OPENAI_IMAGE_AUTO_GENERATION !== "false",
  };
}

/** Map Media Studio / legacy quality labels onto gpt-image-1 quality. */
export function mapToGptImageQuality(raw: string | undefined): "low" | "medium" | "high" {
  return asQuality(raw);
}
