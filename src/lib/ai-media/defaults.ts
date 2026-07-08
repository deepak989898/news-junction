import { AiMediaSettings } from "./types";

export const AI_MEDIA_SETTINGS_DOC_ID = "aiMediaSettings";
export const MEDIA_BRAND_KIT_DOC_ID = "mediaBrandKit";

export const DEFAULT_AI_MEDIA_SETTINGS: AiMediaSettings = {
  defaultProvider: "openai-images",
  defaultImageSize: "1536x1024",
  defaultQuality: "hd",
  dailyImageLimit: 200,
  monthlyImageLimit: 3000,
  maxImageCost: 300,
  requireApproval: true,
  watermarkEnabled: false,
  autoCompress: true,
  autoWebP: true,
  defaultStyle: "editorial",
};

export const IMAGE_STYLE_GUIDE: Record<string, string> = {
  modern: "modern clean newsroom visual style",
  editorial: "editorial newspaper style, serious and factual",
  minimal: "minimal design with uncluttered composition",
  newspaper: "classic newspaper illustration look",
  magazine: "high-contrast magazine cover style",
  corporate: "professional corporate visual language",
  technology: "technology-focused futuristic style",
  sports: "dynamic sports action style",
  business: "business and economy editorial style",
  finance: "finance charts and market tone (without fake data)",
  health: "calm health-news visual style",
  entertainment: "vibrant entertainment editorial style",
  travel: "travel destination news style",
  education: "education newsroom visual style",
  neutral_illustration: "neutral informational illustration",
  flat_design: "flat vector inspired style",
  "3d_illustration": "3D illustration style",
  photorealistic: "photorealistic documentary style",
  clean_infographic: "clean infographic inspired style",
};

export const BANNED_PROMPT_TERMS = [
  "copyrighted character",
  "celebrity portrait",
  "fake document",
  "forged",
  "gore",
  "graphic violence",
  "nsfw",
  "hate symbol",
];
