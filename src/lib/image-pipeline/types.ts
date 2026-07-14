export type SubjectType =
  | "real_person"
  | "organization"
  | "location"
  | "event"
  | "product"
  | "sports_event"
  | "building"
  | "court"
  | "government"
  | "health"
  | "technology"
  | "generic_topic";

export type ImageStrategy =
  | "licensed_source_image"
  | "official_image"
  | "approved_library_image"
  | "openai_generated"
  | "neutral_illustration"
  | "category_fallback";

export type ImageOrigin =
  | "source"
  | "official"
  | "commons"
  | "stock"
  | "admin"
  | "openai"
  | "fallback"
  | "cached";

export type ImageStatus =
  | "pending"
  | "searching"
  | "generating"
  | "validating"
  | "approved"
  | "rejected"
  | "fallback"
  | "manualReview"
  | "failed";

export type RiskLevel = "low" | "medium" | "high";

export interface ArticleImageAnalysis {
  primarySubject: string;
  subjectType: SubjectType;
  namedPeople: string[];
  namedOrganizations: string[];
  location: string;
  visualKeywords: string[];
  imageStrategy: ImageStrategy;
  reason: string;
  riskLevel: RiskLevel;
  factualVisualSummary: string;
  isRealPersonPrimary: boolean;
}

export interface ImageValidationResult {
  relevanceScore: number;
  clarityScore: number;
  qualityScore: number;
  misleadingRisk: RiskLevel;
  personMismatchRisk: RiskLevel;
  approved: boolean;
  rejectionReasons: string[];
}

export interface ImageVariantUrls {
  large: string;
  medium: string;
  thumbnail: string;
  webp: string;
}

export interface ArticleImageMetadata {
  imageUrl: string;
  imageOriginalUrl?: string;
  imageThumbnailUrl?: string;
  imageMediumUrl?: string;
  imageLargeUrl?: string;
  imageWebpUrl?: string;
  imageAltHi?: string;
  imageAltEn?: string;
  imageCredit?: string;
  imageSourceName?: string;
  imageSourcePageUrl?: string;
  imageLicence?: string;
  imageOrigin?: ImageOrigin;
  imageProvider?: string;
  imagePrompt?: string;
  imageRelevanceScore?: number;
  imageQualityScore?: number;
  imageStatus?: ImageStatus;
  focalPointX?: number;
  focalPointY?: number;
  imageGeneratedAt?: string;
  imageFileHash?: string;
  imageAnalysis?: Partial<ArticleImageAnalysis>;
  imageValidation?: Partial<ImageValidationResult>;
}

export interface ImagePipelineInput {
  articleId: string;
  rawNewsId: string;
  titleHi: string;
  titleEn: string;
  summaryHi: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
  categoryNameHi: string;
  sourceName: string;
  sourceUrl: string;
  originalLink: string;
  originalImage: string;
  generatedImageUrl?: string;
  sourceTrustLevel?: "low" | "medium" | "high";
  sourceAllowsImageReuse?: boolean;
  preferHostedFirst?: boolean;
  /** Skip OpenAI image calls (use source/fallback) — required for Vercel process timeouts */
  skipOpenAiImage?: boolean;
  forceNeutralAi?: boolean;
}

export interface ImagePipelineResult {
  metadata: ArticleImageMetadata;
  generated: boolean;
  source: ImageOrigin;
  strategy: ImageStrategy;
  requiresManualReview: boolean;
}

export interface ImagePipelineSettings {
  openAiImageEnabled: boolean;
  generateImagesAutomatically: boolean;
  realPersonAiImageDisabled: boolean;
  minimumRelevanceScore: number;
  minimumQualityScore: number;
  minimumClarityScore: number;
  maximumRetries: number;
  maximumDailyImages: number;
  maximumMonthlyImages: number;
  manualReviewForHighRisk: boolean;
  allowSourceImages: boolean;
  allowWikimediaImages: boolean;
  allowedImageDomains: string[];
  categoryFallbackImages: Record<string, string>;
  defaultCategoryImage: string;
  minimumImageWidth: number;
  minimumImageHeight: number;
}
