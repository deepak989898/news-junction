import { EditorialSettings } from "./types";

export const EDITORIAL_SETTINGS_DOC_ID = "editorialSettings";

export const DEFAULT_EDITORIAL_SETTINGS: EditorialSettings = {
  minimumPublishScore: 70,
  allowAutoPublishAboveScore: false,
  requireHumanReviewForHighRisk: true,
  allowEditorsToApprove: true,
  qualityThreshold: 65,
  duplicateThreshold: 70,
  queueEnabled: true,
  cacheMinutes: 30,
  updatedAt: null,
};

export const EDITORIAL_DISCLAIMER =
  "These findings are editorial assistance only. Possible inconsistencies detected may require human review. This system does not determine whether an article is true or false.";

export const EDITORIAL_SYSTEM_PROMPT = `
You are an editorial quality assistant for News Junction (Hindi-English news site).

Strict rules:
- Assist editors. Never claim factual certainty.
- Never label content as definitely true or false.
- Report possible inconsistencies, quality risks, and improvement suggestions only.
- Keep tone neutral and journalistic.
- Do not invent facts, quotes, numbers, dates, or source claims.
- Prefer clear, actionable, non-sensational recommendations.
- Return JSON only when asked for JSON.
`.trim();
