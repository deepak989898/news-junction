export type GoogleTrendsMode = "rss" | "officialApi";

export type TrendTopicStatus =
  | "fetched"
  | "duplicate"
  | "researching"
  | "insufficientSources"
  | "verified"
  | "processing"
  | "pendingApproval"
  | "published"
  | "rejected"
  | "failed";

export type TrendSourceType = "googleTrendsRss" | "googleTrendsApi";

export type AutomationRiskLevel = "low" | "medium" | "high";

export interface GoogleTrendsCategoryMapping {
  googleCategory: string;
  mappedCategoryId: string;
  mappedCategoryNameHi: string;
  mappedCategoryNameEn: string;
}

export interface GoogleTrendsSettings {
  enabled: boolean;
  mode: GoogleTrendsMode;
  country: string;
  language: "hi" | "en";
  fetchIntervalMinutes: number;
  minimumSearchVolume: number;
  activeOnly: boolean;
  maximumTopicsPerRun: number;
  maximumArticlesPerDay: number;
  maximumArticlesPerCategoryPerDay: number;
  categoryMappings: GoogleTrendsCategoryMapping[];
  requireSourceVerification: boolean;
  minimumVerifiedSources: number;
  autoPublishLowRisk: boolean;
  highRiskAlwaysApproval: boolean;
  sourceResearchTimeoutMs: number;
  aiRetryLimit: number;
  trendCooldownHours: number;
  lastFetchRun: string | null;
  lastResearchRun: string | null;
  lastProcessRun: string | null;
  lastPublishRun: string | null;
  /** Last fetch counters shown in admin UI */
  lastFetchSummary?: {
    fetched: number;
    skipped: number;
    duplicates: number;
    errors: number;
    total: number;
    message: string;
  } | null;
  /** Set true only when official Google Trends API credentials are configured */
  officialApiConfigured: boolean;
}

export interface TrendTopic {
  id: string;
  trendId: string;
  title: string;
  normalizedTitle: string;
  relatedQueries: string[];
  searchVolume: number;
  growthPercentage: number;
  trendStatus: "active" | "ended" | "unknown";
  startedAt: string | null;
  endedAt: string | null;
  category: string;
  mappedCategoryId: string;
  country: string;
  sourceType: TrendSourceType;
  sourceUrl: string;
  fetchedAt: string | null;
  status: TrendTopicStatus;
  riskLevel: AutomationRiskLevel;
  duplicateScore: number;
  duplicateReason?: string;
  priorityScore: number;
  articleId?: string;
  aiOutput?: Record<string, unknown> | null;
  imageUrl?: string;
  verificationNotes?: string;
  errorMessage?: string;
  isTestRecord?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TrendSourceCandidate {
  id: string;
  trendId: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  trustLevel: "low" | "medium" | "high";
  matchScore: number;
  selected: boolean;
  rejectionReason?: string;
  createdAt: string | null;
}

export interface TrendAutomationLog {
  id: string;
  type: "fetch" | "research" | "verify" | "generate" | "image" | "publish" | "error";
  message: string;
  trendId?: string;
  category?: string;
  status: string;
  estimatedCost?: number;
  createdAt: string | null;
}

export interface FetchedGoogleTrendItem {
  title: string;
  normalizedTitle: string;
  relatedQueries: string[];
  searchVolume: number;
  category: string;
  sourceUrl: string;
  fetchedAt: string;
  relatedNews: Array<{ title: string; url: string; snippet: string }>;
  trendStatus: "active" | "ended" | "unknown";
}

export interface VerifiedTrendContext {
  trendId: string;
  centralFacts: string;
  sources: Array<Omit<TrendSourceCandidate, "id" | "createdAt"> & { selected: boolean }>;
  agreedEntities: string[];
  riskLevel: AutomationRiskLevel;
}
