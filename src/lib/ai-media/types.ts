export type MediaProvider = "openai-images" | "google-imagen" | "stability-ai";
export type MediaStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "retrying";
export type MediaAssetStatus = "pending" | "approved" | "rejected" | "applied";

export type MediaImageType =
  | "article_featured"
  | "breaking_news"
  | "category_banner"
  | "homepage_hero"
  | "trending_banner"
  | "editors_pick_banner"
  | "open_graph"
  | "twitter_card"
  | "youtube_thumbnail"
  | "newsletter_banner"
  | "push_banner"
  | "mobile_banner"
  | "desktop_banner";

export type VisualStyle =
  | "modern"
  | "editorial"
  | "minimal"
  | "newspaper"
  | "magazine"
  | "corporate"
  | "technology"
  | "sports"
  | "business"
  | "finance"
  | "health"
  | "entertainment"
  | "travel"
  | "education"
  | "neutral_illustration"
  | "flat_design"
  | "3d_illustration"
  | "photorealistic"
  | "clean_infographic";

export interface AiMediaSettings {
  defaultProvider: MediaProvider;
  defaultImageSize: "1024x1024" | "1536x1024" | "1024x1536" | "1792x1024" | "1024x1792";
  defaultQuality: "standard" | "hd";
  dailyImageLimit: number;
  monthlyImageLimit: number;
  maxImageCost: number;
  requireApproval: boolean;
  watermarkEnabled: boolean;
  autoCompress: boolean;
  autoWebP: boolean;
  defaultStyle: VisualStyle;
  updatedAt?: string | null;
}

export interface MediaBrandKit {
  logoUrl?: string;
  logoDarkUrl?: string;
  logoLightUrl?: string;
  primaryColors?: string[];
  secondaryColors?: string[];
  typography?: string;
  brandStyle?: string;
  updatedAt?: string | null;
}

export interface MediaAsset {
  imageId: string;
  articleId?: string;
  categoryId?: string;
  provider: MediaProvider;
  prompt: string;
  revisedPrompt?: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  style: VisualStyle;
  imageType: MediaImageType;
  status: MediaAssetStatus;
  cost: number;
  createdBy: string;
  version: number;
  parentImageId?: string;
  moderationNotes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaGenerationQueueItem {
  id?: string;
  articleId?: string;
  categoryId?: string;
  imageType: MediaImageType;
  provider: MediaProvider;
  style: VisualStyle;
  language: "hi" | "en" | "both";
  customPrompt?: string;
  status: MediaStatus;
  retryCount: number;
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMediaLog {
  id?: string;
  articleId?: string;
  actionType: string;
  provider: MediaProvider;
  inputPreview: string;
  outputPreview: string;
  usedBy: string;
  imagesGenerated: number;
  estimatedCost: number;
  status: "success" | "failed" | "pending";
  createdAt: string;
}

export interface MediaModerationResult {
  passed: boolean;
  reasons: string[];
}
