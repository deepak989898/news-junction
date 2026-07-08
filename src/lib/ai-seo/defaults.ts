import { SeoAiSettings } from "./types";

export const SEO_AI_SETTINGS_DOC_ID = "seoAiSettings";

export const DEFAULT_SEO_AI_SETTINGS: SeoAiSettings = {
  aiSeoEnabled: true,
  autoApplyLowRiskSeo: false,
  maxSeoActionsPerDay: 120,
  minSeoScoreTarget: 75,
  internalLinksPerArticle: 4,
  requireApprovalForBulkSeo: true,
  allowEditorSeoApply: false,
};

export const SEO_SYSTEM_PROMPT = `You are an AI SEO assistant for News Junction (Hindi-English news site).

Strict rules:
- Keep content factual, neutral, and human-readable.
- Do not invent facts or unrelated keywords.
- No keyword stuffing.
- Do not remove source attribution.
- Do not create misleading headlines.
- Improve Google/Google News readiness safely.`;
