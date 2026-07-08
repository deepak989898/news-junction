import { AISettings, AIPromptTemplate } from "./types";

export const AI_SETTINGS_DOC_ID = "aiSettings";

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  openaiModel: "gpt-4o-mini",
  geminiModel: "gemini-1.5-flash",
  aiEnabled: true,
  dailyTokenLimit: 100000,
  monthlyCostLimit: 50,
  requireApprovalForAIChanges: false,
  defaultTone: "neutral",
  defaultLength: "medium",
};

export const DEFAULT_PROMPT_TEMPLATES: Omit<AIPromptTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Headline Rewrite",
    type: "headline_rewrite",
    prompt: "Rewrite the headline in a clear, neutral news style. Do not invent facts. Preserve meaning.",
    isActive: true,
  },
  {
    name: "Summary Rewrite",
    type: "summary_rewrite",
    prompt: "Rewrite the summary clearly and concisely. Do not add unsupported claims.",
    isActive: true,
  },
  {
    name: "Content Improve",
    type: "content_improve",
    prompt: "Improve grammar, clarity, and structure. Keep all facts unchanged. Use neutral news tone.",
    isActive: true,
  },
  {
    name: "Translate HI to EN",
    type: "translate_hi_en",
    prompt: "Translate accurately from Hindi to English. Preserve meaning and tone.",
    isActive: true,
  },
  {
    name: "Translate EN to HI",
    type: "translate_en_hi",
    prompt: "Translate accurately from English to Hindi. Preserve meaning and tone.",
    isActive: true,
  },
  {
    name: "SEO Generate",
    type: "seo_generate",
    prompt: "Generate SEO title and meta description. No clickbait. Accurate to content.",
    isActive: true,
  },
  {
    name: "Social Caption",
    type: "social_caption",
    prompt: "Generate short social media captions for Facebook, X, and WhatsApp. Factual, no hype.",
    isActive: true,
  },
  {
    name: "Push Notification",
    type: "push_notification",
    prompt: "Write a concise push notification under 120 characters. Factual headline style.",
    isActive: true,
  },
  {
    name: "Newsletter Snippet",
    type: "newsletter_snippet",
    prompt: "Write a 2-3 sentence newsletter snippet with a read-more hook. No invented facts.",
    isActive: true,
  },
  {
    name: "FAQ Generate",
    type: "faq_generate",
    prompt: "Generate 3-5 FAQ items answerable from the article content only. Do not invent.",
    isActive: true,
  },
  {
    name: "Risk Check",
    type: "risk_check",
    prompt: "Analyze article for publishing risk: politics, crime, health, finance, religion, legal, election, violence, death.",
    isActive: true,
  },
];

export const CONTENT_ACTION_LABELS: Record<string, string> = {
  rewrite_headline: "Rewrite Headline",
  headline_options: "5 Headline Options",
  improve_headline_hi: "Improve Hindi Headline",
  improve_headline_en: "Improve English Headline",
  rewrite_summary: "Rewrite Summary",
  expand_summary: "Expand Summary",
  shorten_summary: "Shorten Summary",
  improve_content: "Improve Content",
  notes_to_article: "Convert Notes to Article",
  translate_hi_en: "Translate Hindi → English",
  translate_en_hi: "Translate English → Hindi",
  bullet_summary: "Bullet Summary",
  key_points: "Key Points",
  faq: "Generate FAQ",
  generate_tags: "Generate Tags",
  category_suggestion: "Category Suggestion",
  seo_title: "SEO Title",
  seo_description: "SEO Description",
  push_notification: "Push Notification Text",
  newsletter_snippet: "Newsletter Snippet",
  social_captions: "Social Media Captions",
  editor_note: "Editor Note",
  source_credit: "Source Credit Text",
  risk_check: "Risk Check",
};

export const SAFETY_SYSTEM_PROMPT = `You are an AI assistant for News Junction, a bilingual Hindi-English news website in India.

STRICT SAFETY RULES:
- Use neutral news tone. No political bias. No hate speech.
- Do NOT invent facts, statistics, quotes, or events.
- Do NOT add unsupported claims beyond the provided content.
- No clickbait or sensational crime language.
- No medical, legal, or financial advice presented as fact.
- Preserve source attribution when relevant.
- Improve language and clarity only — do not change factual meaning.
- For high-risk topics (politics, crime, health, religion, court, election, violence, death), flag for human review.
- Return clean text unless JSON is explicitly requested.`;
