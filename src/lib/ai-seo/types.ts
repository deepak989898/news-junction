import { AIStudioProvider } from "@/lib/ai-studio/types";

export interface SeoAiSettings {
  aiSeoEnabled: boolean;
  autoApplyLowRiskSeo: boolean;
  maxSeoActionsPerDay: number;
  minSeoScoreTarget: number;
  internalLinksPerArticle: number;
  requireApprovalForBulkSeo: boolean;
  allowEditorSeoApply: boolean;
  updatedAt?: string | null;
}

export interface SeoAuditResult {
  seoScore: number;
  issues: string[];
  suggestions: string[];
  priority: "low" | "medium" | "high";
  fixedFields: Record<string, string>;
  googleNewsReady: boolean;
}

export interface SeoKeywordResult {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  hindiKeywords: string[];
  englishKeywords: string[];
  hinglishKeywords: string[];
  trendingKeywordIdeas: string[];
  faqKeywords: string[];
  searchIntent: string;
}

export interface SeoMetaResult {
  seoTitleHi: string;
  seoTitleEn: string;
  metaDescriptionHi: string;
  metaDescriptionEn: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

export interface SeoSlugResult {
  englishSlug: string;
  hindiTransliterationSlug: string;
  shortSeoSlug: string;
  categoryBasedSlug: string;
}

export interface SeoInternalLinkSuggestion {
  id?: string;
  articleId: string;
  suggestedArticleId: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  anchorTextHi: string;
  anchorTextEn: string;
  relevanceScore: number;
  status: "pending" | "approved" | "rejected" | "applied";
  createdAt: string;
  updatedAt: string;
}

export interface SeoFaqItem {
  questionHi: string;
  answerHi: string;
  questionEn: string;
  answerEn: string;
}

export interface SeoTopicSuggestion {
  id?: string;
  titleHi: string;
  titleEn: string;
  categoryId: string;
  keyword: string;
  reason: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "created";
  createdAt: string;
  updatedAt: string;
}

export interface AiSeoLog {
  id?: string;
  articleId: string;
  actionType: string;
  provider: AIStudioProvider;
  inputPreview: string;
  outputPreview: string;
  seoScoreBefore: number;
  seoScoreAfter: number;
  usedBy: string;
  tokensUsed: number;
  estimatedCost: number;
  status: "success" | "failed" | "pending";
  createdAt: string;
}
