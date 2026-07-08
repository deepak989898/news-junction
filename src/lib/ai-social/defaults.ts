import { SocialManagerSettings, SocialTemplate } from "./types";

export const SOCIAL_MANAGER_SETTINGS_DOC_ID = "socialManagerSettings";

export const DEFAULT_SOCIAL_SETTINGS: SocialManagerSettings = {
  autoPublishEnabled: false,
  requireApprovalBeforePosting: true,
  requireApprovalForHighRiskCategories: true,
  allowEditorsScheduleOnly: true,
  allowOnlySuperAdminImmediatePublish: true,
  maxRetries: 3,
  businessHoursStart: 9,
  businessHoursEnd: 21,
  timezone: "Asia/Kolkata",
  publishBreakingImmediately: true,
  delayEntertainmentMinutes: 30,
  publishOnlyIfFeaturedImageExists: true,
};

export const DEFAULT_SOCIAL_TEMPLATES: Omit<SocialTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Breaking News",
    type: "breaking_news",
    prompt: "Create urgent but factual breaking update copy. Keep neutral tone. Include clear CTA.",
    isActive: true,
  },
  {
    name: "Sports",
    type: "sports",
    prompt: "Create energetic but factual sports post with context and CTA.",
    isActive: true,
  },
  {
    name: "Technology",
    type: "technology",
    prompt: "Create concise tech update with relevance and CTA.",
    isActive: true,
  },
  {
    name: "Business",
    type: "business",
    prompt: "Create business post emphasizing market impact and CTA.",
    isActive: true,
  },
  {
    name: "Entertainment",
    type: "entertainment",
    prompt: "Create engaging entertainment post without clickbait.",
    isActive: true,
  },
  {
    name: "Health",
    type: "health",
    prompt: "Create health post that avoids medical claims and keeps facts grounded.",
    isActive: true,
  },
  {
    name: "Politics",
    type: "politics",
    prompt: "Create neutral political update; avoid bias and inflammatory phrasing.",
    isActive: true,
  },
  {
    name: "General",
    type: "general",
    prompt: "Create concise social post for a news article with hashtags and CTA.",
    isActive: true,
  },
];

export const SOCIAL_SYSTEM_PROMPT = `You are a social distribution assistant for News Junction.
Rules:
- Keep text factual, concise, and platform-appropriate.
- No fake claims, no sensationalism, no hate speech.
- Maintain neutral political tone.
- Include helpful CTA.
- Return JSON only when requested.`;
