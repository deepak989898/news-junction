export type AIStudioProvider = "openai" | "gemini";
export type AIStudioTone = "neutral" | "formal" | "simple" | "professional";
export type AIStudioLength = "short" | "medium" | "detailed";

export type ContentActionType =
  | "rewrite_headline"
  | "headline_options"
  | "improve_headline_hi"
  | "improve_headline_en"
  | "rewrite_summary"
  | "expand_summary"
  | "shorten_summary"
  | "improve_content"
  | "notes_to_article"
  | "translate_hi_en"
  | "translate_en_hi"
  | "bullet_summary"
  | "key_points"
  | "faq"
  | "generate_tags"
  | "category_suggestion"
  | "seo_title"
  | "seo_description"
  | "push_notification"
  | "newsletter_snippet"
  | "social_captions"
  | "editor_note"
  | "source_credit"
  | "risk_check";

export interface AISettings {
  provider: AIStudioProvider;
  openaiModel: string;
  geminiModel: string;
  aiEnabled: boolean;
  dailyTokenLimit: number;
  monthlyCostLimit: number;
  requireApprovalForAIChanges: boolean;
  defaultTone: AIStudioTone;
  defaultLength: AIStudioLength;
  updatedAt?: string | null;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  type: string;
  prompt: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AIContentLog {
  id: string;
  articleId: string;
  actionType: string;
  provider: string;
  inputPreview: string;
  outputPreview: string;
  usedBy: string;
  tokensUsed: number;
  estimatedCost: number;
  status: "success" | "failed" | "pending";
  createdAt: string | null;
}

export interface AIPendingChange {
  id: string;
  articleId: string;
  actionType: string;
  field: string;
  oldValue: string;
  newValue: string;
  requestedBy: string;
  requestedByName?: string;
  status: "pending" | "approved" | "rejected" | "applied";
  reviewedBy?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AIRiskReport {
  riskLevel: "low" | "medium" | "high";
  riskReasons: string[];
  needsHumanApproval: boolean;
  missingFacts: string[];
  possibleBias: string[];
  sourceConsistencyNotes: string;
}

export interface ContentActionResult {
  actionType: ContentActionType;
  output: string;
  outputHi?: string;
  outputEn?: string;
  structured?: Record<string, unknown>;
  tokensUsed: number;
  estimatedCost: number;
  field?: string;
  pendingChangeId?: string;
}

export interface AIUsageStats {
  dailyTokens: number;
  monthlyTokens: number;
  dailyCost: number;
  monthlyCost: number;
  dailyLimit: number;
  monthlyLimit: number;
  limitExceeded: boolean;
}
