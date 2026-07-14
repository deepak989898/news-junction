import { ContentActionType, AISettings } from "./types";
import { SAFETY_SYSTEM_PROMPT } from "./defaults";
import { getPromptTemplate } from "./server-db";

export { getTargetField } from "./field-map";

interface ArticleContext {
  titleHi?: string;
  titleEn?: string;
  summaryHi?: string;
  summaryEn?: string;
  contentHi?: string;
  contentEn?: string;
  tags?: string[];
  categoryId?: string;
  seoTitle?: string;
  seoDescription?: string;
  sourceCreditText?: string;
  editorNote?: string;
  language?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getTitle(article: ArticleContext, lang: "hi" | "en" | "both"): string {
  if (lang === "hi") return article.titleHi || article.titleEn || "";
  if (lang === "en") return article.titleEn || article.titleHi || "";
  return article.titleHi || article.titleEn || "";
}

function getSummary(article: ArticleContext, lang: "hi" | "en" | "both"): string {
  if (lang === "hi") return article.summaryHi || article.summaryEn || "";
  if (lang === "en") return article.summaryEn || article.summaryHi || "";
  return article.summaryHi || article.summaryEn || "";
}

function getContent(article: ArticleContext, lang: "hi" | "en" | "both"): string {
  if (lang === "hi") return article.contentHi || article.contentEn || "";
  if (lang === "en") return article.contentEn || article.contentHi || "";
  return article.contentHi || article.contentEn || "";
}

export async function buildPrompt(
  actionType: ContentActionType,
  article: Record<string, unknown>,
  settings: AISettings,
  language: "hi" | "en" | "both",
  customInstruction?: string
): Promise<{ systemPrompt: string; userPrompt: string; inputPreview: string }> {
  const templateType = getTemplateType(actionType);
  const template = (await getPromptTemplate(templateType)) || "";
  const tone = settings.defaultTone;
  const length = settings.defaultLength;

  const ctx = article as ArticleContext;
  const title = getTitle(ctx, language);
  const summary = getSummary(ctx, language);
  const content = stripHtml(getContent(ctx, language));

  let userPrompt = "";
  const inputPreview = [title, summary, content.slice(0, 500)].filter(Boolean).join(" | ").slice(0, 300);

  switch (actionType) {
    case "rewrite_headline":
      userPrompt = `${template}\nTone: ${tone}. Length: ${length}.\nHeadline: ${title}\nSummary context: ${summary}`;
      break;
    case "headline_options":
      userPrompt = `Generate exactly 5 headline options, one per line numbered 1-5. Neutral news tone. No clickbait.\nArticle: ${title}\nSummary: ${summary}`;
      break;
    case "improve_headline_hi":
      userPrompt = `${template || "Improve this Hindi headline."}\nHindi headline: ${ctx.titleHi || ""}`;
      break;
    case "improve_headline_en":
      userPrompt = `${template || "Improve this English headline."}\nEnglish headline: ${ctx.titleEn || ""}`;
      break;
    case "rewrite_summary":
      userPrompt = `${template}\nTone: ${tone}. Length: ${length}.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "expand_summary":
      userPrompt = `Expand this summary to ${length} length. Add detail only from the article content. Do not invent.\nTitle: ${title}\nSummary: ${summary}\nContent excerpt: ${content.slice(0, 2000)}`;
      break;
    case "shorten_summary":
      userPrompt = `Shorten this summary to 1-2 sentences. Keep key facts.\nSummary: ${summary}`;
      break;
    case "improve_content":
      userPrompt = `${template}\nTone: ${tone}. Length: long (target 6-9 HTML <p> paragraphs, ~450-750 words when facts allow). Do not invent.\nTitle: ${title}\nContent:\n${content.slice(0, 6000)}`;
      break;
    case "notes_to_article":
      userPrompt = `Convert these rough notes into a structured FULL news article in HTML (6-9 <p> tags when notes support it). Also keep a clear lead. Do not invent facts beyond notes.\nNotes:\n${content || summary}`;
      break;
    case "translate_hi_en":
      userPrompt = `${template}\nTranslate to English:\nTitle: ${ctx.titleHi || title}\nContent:\n${stripHtml(ctx.contentHi || content)}`;
      break;
    case "translate_en_hi":
      userPrompt = `${template}\nTranslate to Hindi:\nTitle: ${ctx.titleEn || title}\nContent:\n${stripHtml(ctx.contentEn || content)}`;
      break;
    case "bullet_summary":
      userPrompt = `Generate a bullet-point summary (5-7 bullets). Facts from article only.\nTitle: ${title}\nContent:\n${content.slice(0, 3000)}`;
      break;
    case "key_points":
      userPrompt = `Extract 4-6 key points as numbered list. Article facts only.\nTitle: ${title}\nContent:\n${content.slice(0, 3000)}`;
      break;
    case "faq":
      userPrompt = `${template}\nTitle: ${title}\nContent:\n${content.slice(0, 4000)}\nReturn as JSON array: [{"question":"","answer":""}]`;
      break;
    case "generate_tags":
      userPrompt = `Suggest 5-8 relevant tags as comma-separated list. No hashtags.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "category_suggestion":
      userPrompt = `Suggest the best news category from: politics, business, sports, entertainment, technology, health, world, national, local, crime, education, lifestyle.\nReturn category name only.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "seo_title":
      userPrompt = `${template}\nGenerate SEO title under 60 chars. No clickbait.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "seo_description":
      userPrompt = `${template}\nGenerate meta description under 155 chars.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "push_notification":
      userPrompt = `${template}\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "newsletter_snippet":
      userPrompt = `${template}\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "social_captions":
      userPrompt = `${template}\nTitle: ${title}\nSummary: ${summary}\nReturn format:\nFacebook: ...\nX: ...\nWhatsApp: ...`;
      break;
    case "editor_note":
      userPrompt = `Write a brief internal editor note about this article (factual, neutral). Not for publication.\nTitle: ${title}\nSummary: ${summary}`;
      break;
    case "source_credit":
      userPrompt = `Write source credit/attribution text. Preserve any existing attribution.\nTitle: ${title}\nExisting credit: ${ctx.sourceCreditText || "none"}\nContent excerpt: ${content.slice(0, 1000)}`;
      break;
    default:
      userPrompt = `Process this article.\nTitle: ${title}\nContent: ${content.slice(0, 2000)}`;
  }

  if (customInstruction?.trim()) {
    userPrompt += `\n\nAdditional instruction: ${customInstruction.trim()}`;
  }

  return { systemPrompt: SAFETY_SYSTEM_PROMPT, userPrompt, inputPreview };
}

function getTemplateType(actionType: ContentActionType): string {
  const map: Partial<Record<ContentActionType, string>> = {
    rewrite_headline: "headline_rewrite",
    improve_headline_hi: "headline_rewrite",
    improve_headline_en: "headline_rewrite",
    rewrite_summary: "summary_rewrite",
    expand_summary: "summary_rewrite",
    shorten_summary: "summary_rewrite",
    improve_content: "content_improve",
    notes_to_article: "content_improve",
    translate_hi_en: "translate_hi_en",
    translate_en_hi: "translate_en_hi",
    seo_title: "seo_generate",
    seo_description: "seo_generate",
    push_notification: "push_notification",
    newsletter_snippet: "newsletter_snippet",
    social_captions: "social_caption",
    faq: "faq_generate",
  };
  return map[actionType] || "content_improve";
}

export async function buildRiskCheckPrompt(article: Record<string, unknown>): Promise<{ systemPrompt: string; userPrompt: string }> {
  const template = (await getPromptTemplate("risk_check")) || "";
  const ctx = article as ArticleContext;
  const content = stripHtml(getContent(ctx, "both"));
  const userPrompt = `${template}

Analyze this article and return ONLY valid JSON:
{
  "riskLevel": "low|medium|high",
  "riskReasons": ["..."],
  "needsHumanApproval": true/false,
  "missingFacts": ["..."],
  "possibleBias": ["..."],
  "sourceConsistencyNotes": "..."
}

Categories to check: politics, crime, health, finance, religion, court/legal, election, conflict/violence, death/accident.

Title (HI): ${ctx.titleHi}
Title (EN): ${ctx.titleEn}
Summary (HI): ${ctx.summaryHi}
Summary (EN): ${ctx.summaryEn}
Content: ${content.slice(0, 4000)}`;

  return { systemPrompt: SAFETY_SYSTEM_PROMPT, userPrompt };
}
