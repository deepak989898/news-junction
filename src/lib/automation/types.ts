import { DEFAULT_AUTOMATION_SETTINGS } from "./defaults";

export type AIProvider = "openai" | "gemini";
export type RawNewsStatus =
  | "fetched"
  | "duplicate"
  | "processing"
  | "pendingApproval"
  | "approved"
  | "rejected"
  | "published"
  | "failed";

export type AutomationRiskLevel = "low" | "medium" | "high";

export interface AIGeneratedContent {
  titleHi: string;
  titleEn: string;
  summaryHi: string;
  summaryEn: string;
  contentHi: string;
  contentEn: string;
  tags: string[];
  imageAltHi: string;
  imageAltEn: string;
  seoTitleHi: string;
  seoTitleEn: string;
  seoDescriptionHi: string;
  seoDescriptionEn: string;
  riskLevel: AutomationRiskLevel;
  factCheckNotes: string;
  suggestedCategory: string;
  sourceCreditText: string;
}

export interface RawNewsItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  originalTitle: string;
  originalLink: string;
  originalSummary: string;
  originalImage: string;
  originalPublishedAt: string | null;
  language: string;
  categoryId: string;
  status: RawNewsStatus;
  riskLevel: AutomationRiskLevel;
  duplicateScore: number;
  aiOutput?: AIGeneratedContent | null;
  generatedImageUrl?: string;
  newsId?: string;
  errorMessage?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AutomationSettings {
  automationEnabled: boolean;
  aiProvider: AIProvider;
  autoPublishLowRisk: boolean;
  autoPublishMediumRisk: boolean;
  highRiskAlwaysApproval: boolean;
  maxArticlesPerDay: number;
  maxArticlesPerCategoryPerDay: number;
  duplicateThreshold: number;
  defaultAuthorName: string;
  defaultSourceCreditText: string;
  defaultCategoryImage: string;
  generateAiImages: boolean;
  lastFetchRun: string | null;
  lastProcessRun: string | null;
  lastCleanupRun: string | null;
}

export interface AutomationLog {
  id: string;
  type: "fetch" | "process" | "publish" | "error";
  message: string;
  sourceId?: string;
  rawNewsId?: string;
  newsId?: string;
  status: string;
  createdAt: string | null;
}

export interface AutomationStats {
  fetchedToday: number;
  processedToday: number;
  publishedToday: number;
  pendingApproval: number;
  failed: number;
  duplicates: number;
  lastFetchRun: string | null;
  lastProcessRun: string | null;
}

export { DEFAULT_AUTOMATION_SETTINGS };
