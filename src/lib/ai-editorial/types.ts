export type EditorialReviewType =
  | "full"
  | "headline"
  | "summary"
  | "language"
  | "seo"
  | "entities"
  | "image"
  | "duplicate"
  | "source_consistency"
  | "readability"
  | "category"
  | "tags";

export type EditorialStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "approved"
  | "rejected"
  | "applied"
  | "failed"
  | "needs_review";

export type SourceConsistencyLabel = "Consistent" | "Needs Review" | "Major Difference";

export interface EditorialSettings {
  minimumPublishScore: number;
  allowAutoPublishAboveScore: boolean;
  requireHumanReviewForHighRisk: boolean;
  allowEditorsToApprove: boolean;
  qualityThreshold: number;
  duplicateThreshold: number;
  queueEnabled: boolean;
  cacheMinutes: number;
  updatedAt?: string | null;
}

export interface EditorialIssue {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  field?: string;
}

export interface EditorialSuggestion {
  type: string;
  message: string;
  suggestedValue?: string;
  alternatives?: string[];
}

export interface EditorialEntity {
  type: "person" | "organization" | "place" | "event" | "date" | "number" | "currency" | "other";
  value: string;
  confidence: "low" | "medium" | "high";
}

export interface EditorialChecklist {
  headlineReviewed: boolean;
  summaryReviewed: boolean;
  sourceLinkPresent: boolean;
  imageAvailable: boolean;
  imageAltAvailable: boolean;
  seoComplete: boolean;
  schemaComplete: boolean;
  categoryCorrect: boolean;
  tagsAdded: boolean;
  translationReviewed: boolean;
  readyForPublish: boolean;
}

export interface EditorialScores {
  overall: number;
  readability: number;
  seo: number;
  languageQuality: number;
  duplicateRisk: number;
  sourceConsistency: number;
  translationQuality: number;
  headlineQuality: number;
  summaryQuality: number;
}

export interface EditorialReviewResult {
  articleId: string;
  reviewType: EditorialReviewType;
  scores: EditorialScores;
  sourceConsistencyLabel: SourceConsistencyLabel;
  issues: EditorialIssue[];
  suggestions: EditorialSuggestion[];
  entities: EditorialEntity[];
  checklist: EditorialChecklist;
  alternativeHeadlines: string[];
  improvedSummary?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedTagsHi: string[];
  suggestedTagsEn: string[];
  tagsToRemove: string[];
  duplicatePercent: number;
  duplicateMatches: { articleId: string; title: string; similarity: number; reason: string }[];
  reviewSummary: string;
  disclaimer: string;
}

export interface EditorialReview {
  id: string;
  articleId: string;
  reviewType: EditorialReviewType;
  reviewScore: number;
  reviewSummary: string;
  issues: EditorialIssue[];
  suggestions: EditorialSuggestion[];
  scores?: EditorialScores;
  entities?: EditorialEntity[];
  checklist?: EditorialChecklist;
  result?: EditorialReviewResult;
  reviewedBy: string;
  provider: string;
  status: EditorialStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EditorialLog {
  id: string;
  articleId?: string;
  reviewId?: string;
  actionType:
    | "review_started"
    | "review_completed"
    | "review_queued"
    | "approval"
    | "rejection"
    | "changes_applied"
    | "settings_update"
    | "error";
  status: "success" | "failed" | "pending";
  message: string;
  provider?: string;
  createdBy?: string;
  createdAt: string | null;
}

export interface EditorialQueueItem {
  id: string;
  articleId: string;
  reviewType: EditorialReviewType;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  retryCount: number;
  errorMessage?: string;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EditorialDashboard {
  avgQualityScore: number;
  belowThreshold: number;
  waitingReview: number;
  duplicateWarnings: number;
  seoIssues: number;
  imageIssues: number;
  translationIssues: number;
  headlineIssues: number;
  topReviewed: { articleId: string; score: number; status: string }[];
  settings: EditorialSettings;
  reviews: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  queue: Record<string, unknown>[];
}
