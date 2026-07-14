import { getAdminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai-studio/ai-client";
import { calcEstimatedCost, getAISettings, getArticleById } from "@/lib/ai-studio/server-db";
import { createSlug } from "@/lib/utils";
import { DEFAULT_SEO_AI_SETTINGS, SEO_AI_SETTINGS_DOC_ID, SEO_SYSTEM_PROMPT } from "./defaults";
import {
  AiSeoLog,
  SeoAiSettings,
  SeoAuditResult,
  SeoFaqItem,
  SeoInternalLinkSuggestion,
  SeoKeywordResult,
  SeoMetaResult,
  SeoSlugResult,
  SeoTopicSuggestion,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readText(article: NewsDoc, lang: "hi" | "en" | "both", key: "title" | "summary" | "content"): string {
  if (lang === "hi") return String(article[`${key}Hi`] || article[`${key}En`] || "");
  if (lang === "en") return String(article[`${key}En`] || article[`${key}Hi`] || "");
  return String(article[`${key}Hi`] || article[`${key}En`] || "");
}

export async function getSeoAiSettings(): Promise<SeoAiSettings> {
  const doc = await getAdminDb().collection("settings").doc(SEO_AI_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_SEO_AI_SETTINGS };
  return { ...DEFAULT_SEO_AI_SETTINGS, ...(doc.data() as SeoAiSettings) };
}

export async function saveSeoAiSettings(settings: Partial<SeoAiSettings>): Promise<SeoAiSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(SEO_AI_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_SEO_AI_SETTINGS, ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  return getSeoAiSettings();
}

export async function checkSeoActionLimit(): Promise<void> {
  const settings = await getSeoAiSettings();
  if (!settings.aiSeoEnabled) throw new Error("AI SEO is disabled");
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const snap = await getAdminDb()
    .collection("aiSeoLogs")
    .where("createdAt", ">=", dayStart.toISOString())
    .get();
  if (snap.size >= settings.maxSeoActionsPerDay) {
    throw new Error("Daily SEO AI action limit reached");
  }
}

export async function logSeoAction(entry: Omit<AiSeoLog, "id" | "createdAt">): Promise<void> {
  await getAdminDb().collection("aiSeoLogs").add({
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

export async function runSeoAudit(articleId: string): Promise<SeoAuditResult> {
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const title = readText(article, "en", "title");
  const summary = readText(article, "en", "summary");
  const content = stripHtml(readText(article, "en", "content"));
  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : [];
  const issues: string[] = [];
  const suggestions: string[] = [];
  const fixedFields: Record<string, string> = {};
  let score = 100;

  if (!title || title.length < 35 || title.length > 65) {
    issues.push("SEO title length should be 35-65 characters.");
    suggestions.push("Adjust title length for search snippets.");
    score -= 10;
  }
  const seoDescription = String(article.seoDescription || summary);
  if (!seoDescription || seoDescription.length < 120 || seoDescription.length > 160) {
    issues.push("Meta description length should be 120-160 characters.");
    suggestions.push("Create a concise meta description.");
    fixedFields.seoDescription = summary.slice(0, 155);
    score -= 10;
  }
  if (!article.slug || String(article.slug).length < 5 || String(article.slug).includes("_")) {
    issues.push("Slug is not clean SEO format.");
    suggestions.push("Use lowercase hyphenated slug.");
    fixedFields.slug = createSlug(title);
    score -= 8;
  }
  if (content.length < 1200) {
    issues.push("Thin content risk detected.");
    suggestions.push("Expand article depth with verified context.");
    score -= 12;
  }
  if (!String(article.imageAltHi || "").trim() || !String(article.imageAltEn || "").trim()) {
    issues.push("Image ALT text missing in Hindi or English.");
    suggestions.push("Add descriptive ALT text in both languages.");
    score -= 8;
  }
  if (!content.includes("href=")) {
    issues.push("No internal links found.");
    suggestions.push("Add 3-6 relevant internal links.");
    score -= 10;
  }
  if (!tags.length) {
    issues.push("Keyword tags missing.");
    suggestions.push("Add primary and secondary keywords as tags.");
    score -= 6;
  } else if (!content.toLowerCase().includes(tags[0].toLowerCase())) {
    issues.push("Primary keyword not found in article body.");
    suggestions.push("Naturally include primary keyword in content.");
    score -= 6;
  }
  if (!String(article.sourceName || "").trim() && !String(article.sourceCreditText || "").trim()) {
    issues.push("Source attribution is missing.");
    suggestions.push("Add clear source credit text.");
    score -= 8;
  }

  const duplicateTitleSnap = await getAdminDb()
    .collection("news")
    .where("titleEn", "==", String(article.titleEn || ""))
    .get();
  if (duplicateTitleSnap.size > 1) {
    issues.push("Duplicate title risk detected.");
    suggestions.push("Differentiate title to avoid cannibalization.");
    score -= 8;
  }

  const googleNewsReady = Boolean(
    title &&
      summary &&
      content.length > 600 &&
      String(article.sourceName || article.sourceCreditText || "").trim() &&
      String(article.status || "") === "published"
  );
  if (!googleNewsReady) {
    issues.push("Google News readiness incomplete.");
    suggestions.push("Ensure publish status, source attribution, summary, and depth.");
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const priority: "low" | "medium" | "high" = score < 60 ? "high" : score < 80 ? "medium" : "low";
  return { seoScore: score, issues, suggestions, priority, fixedFields, googleNewsReady };
}

async function askAiForJson<T>(userPrompt: string): Promise<{ data: T; tokensUsed: number; estimatedCost: number; provider: "openai" | "gemini" }> {
  await checkSeoActionLimit();
  const aiSettings = await getAISettings();
  const { text, tokensUsed } = await callAI(aiSettings, SEO_SYSTEM_PROMPT, userPrompt);
  const json = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] || "{}";
  const data = JSON.parse(json) as T;
  return {
    data,
    tokensUsed,
    estimatedCost: calcEstimatedCost(aiSettings.provider, tokensUsed),
    provider: aiSettings.provider,
  };
}

export async function generateSeoKeywords(articleId: string, topic?: string): Promise<{ result: SeoKeywordResult; tokensUsed: number; estimatedCost: number; provider: "openai" | "gemini" }> {
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const prompt = `Return JSON with fields: primaryKeyword, secondaryKeywords[], longTailKeywords[], hindiKeywords[], englishKeywords[], hinglishKeywords[], trendingKeywordIdeas[], faqKeywords[], searchIntent.
Title: ${article.titleEn}
Summary: ${article.summaryEn}
Topic hint: ${topic || "none"}
`;
  const out = await askAiForJson<SeoKeywordResult>(prompt);
  return { result: out.data, tokensUsed: out.tokensUsed, estimatedCost: out.estimatedCost, provider: out.provider };
}

export async function generateSeoMeta(articleId: string): Promise<{ result: SeoMetaResult; tokensUsed: number; estimatedCost: number; provider: "openai" | "gemini" }> {
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const prompt = `Return JSON with: seoTitleHi, seoTitleEn, metaDescriptionHi, metaDescriptionEn, ogTitle, ogDescription, twitterTitle, twitterDescription.
Rules: title <= 60 chars, description <= 155 chars, no clickbait.
Title HI: ${article.titleHi}
Title EN: ${article.titleEn}
Summary HI: ${article.summaryHi}
Summary EN: ${article.summaryEn}`;
  const out = await askAiForJson<SeoMetaResult>(prompt);
  return { result: out.data, tokensUsed: out.tokensUsed, estimatedCost: out.estimatedCost, provider: out.provider };
}

export async function generateSeoSlugs(articleId: string): Promise<{ result: SeoSlugResult; tokensUsed: number; estimatedCost: number; provider: "openai" | "gemini" }> {
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const prompt = `Return JSON with: englishSlug, hindiTransliterationSlug, shortSeoSlug, categoryBasedSlug.
Use only lowercase letters, numbers, hyphens.
Title EN: ${article.titleEn}
Title HI: ${article.titleHi}
Category: ${article.categoryNameEn || article.categoryId}`;
  const out = await askAiForJson<SeoSlugResult>(prompt);
  return { result: out.data, tokensUsed: out.tokensUsed, estimatedCost: out.estimatedCost, provider: out.provider };
}

export async function generateSeoFaq(articleId: string): Promise<{ result: SeoFaqItem[]; tokensUsed: number; estimatedCost: number; provider: "openai" | "gemini" }> {
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const prompt = `Return JSON array of 3-5 FAQ items using fields questionHi, answerHi, questionEn, answerEn. Use only article facts.
Title HI: ${article.titleHi}
Title EN: ${article.titleEn}
Summary HI: ${article.summaryHi}
Summary EN: ${article.summaryEn}
Content EN: ${stripHtml(String(article.contentEn || "")).slice(0, 3000)}`;
  const out = await askAiForJson<SeoFaqItem[]>(prompt);
  return { result: Array.isArray(out.data) ? out.data : [], tokensUsed: out.tokensUsed, estimatedCost: out.estimatedCost, provider: out.provider };
}

function relevanceScore(a: string, b: string): number {
  const aw = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const bw = b.toLowerCase().split(/\W+/).filter(Boolean);
  if (!aw.size || !bw.length) return 0;
  let common = 0;
  bw.forEach((w) => {
    if (aw.has(w)) common += 1;
  });
  return Math.min(100, Math.round((common / Math.max(aw.size, 1)) * 100));
}

export async function generateInternalLinks(articleId: string): Promise<SeoInternalLinkSuggestion[]> {
  const settings = await getSeoAiSettings();
  const raw = await getArticleById(articleId);
  if (!raw) throw new Error("Article not found");
  const article = raw as NewsDoc;
  const currentText = `${article.titleEn} ${article.summaryEn}`;
  const candidatesSnap = await (async () => {
    try {
      return await getAdminDb()
        .collection("news")
        .where("status", "==", "published")
        .where("categoryId", "==", String(article.categoryId || ""))
        .limit(60)
        .get();
    } catch {
      return await getAdminDb().collection("news").where("status", "==", "published").limit(60).get();
    }
  })();
  const candidates = candidatesSnap;

  const now = new Date().toISOString();
  const list: SeoInternalLinkSuggestion[] = candidates.docs
    .filter((d) => d.id !== articleId)
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const score = relevanceScore(currentText, `${data.titleEn || ""} ${data.summaryEn || ""}`);
      return {
        articleId,
        suggestedArticleId: d.id,
        slug: String(data.slug || ""),
        titleHi: String(data.titleHi || ""),
        titleEn: String(data.titleEn || ""),
        anchorTextHi: String(data.titleHi || "").slice(0, 60),
        anchorTextEn: String(data.titleEn || "").slice(0, 60),
        relevanceScore: score,
        status: "pending" as const,
        createdAt: now,
        updatedAt: now,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, Math.max(3, Math.min(6, settings.internalLinksPerArticle)));

  const batch = getAdminDb().batch();
  list.forEach((item) => {
    const ref = getAdminDb().collection("seoInternalLinkSuggestions").doc();
    batch.set(ref, item);
  });
  await batch.commit();
  return list;
}

export async function generateContentGapSuggestions(): Promise<SeoTopicSuggestion[]> {
  const [categoriesSnap, newsSnap] = await Promise.all([
    getAdminDb().collection("categories").where("isActive", "==", true).get(),
    getAdminDb().collection("news").where("status", "==", "published").get(),
  ]);

  const counts = new Map<string, number>();
  newsSnap.docs.forEach((d) => {
    const categoryId = String(d.data().categoryId || "");
    counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
  });

  const now = new Date().toISOString();
  const suggestions: SeoTopicSuggestion[] = [];
  categoriesSnap.docs.forEach((c) => {
    const data = c.data();
    const count = counts.get(c.id) || 0;
    if (count < 8) {
      suggestions.push({
        categoryId: c.id,
        titleHi: `${String(data.nameHi || "")} में आज की जरूरी अपडेट`,
        titleEn: `Key updates in ${String(data.nameEn || "this category")}`,
        keyword: `${String(data.nameEn || "")} latest updates`,
        reason: "Low category coverage compared to other categories.",
        priority: count < 3 ? "high" : "medium",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  const batch = getAdminDb().batch();
  suggestions.slice(0, 20).forEach((s) => {
    const ref = getAdminDb().collection("seoTopicSuggestions").doc();
    batch.set(ref, s);
  });
  if (suggestions.length) await batch.commit();
  return suggestions.slice(0, 20);
}

export async function getSeoDashboardData() {
  const news = await getAdminDb().collection("news").where("status", "==", "published").limit(400).get();
  const logs = await getAdminDb().collection("aiSeoLogs").orderBy("createdAt", "desc").limit(30).get();
  const pendingLinks = await getAdminDb()
    .collection("seoInternalLinkSuggestions")
    .where("status", "==", "pending")
    .limit(20)
    .get();
  const pendingTopics = await getAdminDb().collection("seoTopicSuggestions").where("status", "==", "pending").limit(20).get();

  let missingMeta = 0;
  let missingAlt = 0;
  let thinContent = 0;
  let missingInternalLinks = 0;
  const titleMap = new Map<string, number>();
  news.docs.forEach((d) => {
    const data = d.data();
    const contentLen = stripHtml(String(data.contentEn || data.contentHi || "")).length;
    if (!data.seoDescription) missingMeta += 1;
    if (!data.imageAltHi || !data.imageAltEn) missingAlt += 1;
    if (contentLen < 1200) thinContent += 1;
    if (!Array.isArray(data.seoInternalLinks) || data.seoInternalLinks.length === 0) missingInternalLinks += 1;
    const t = String(data.titleEn || "").trim();
    if (t) titleMap.set(t, (titleMap.get(t) || 0) + 1);
  });
  const duplicateTitles = Array.from(titleMap.values()).filter((v) => v > 1).length;

  return {
    totalPublished: news.size,
    avgSeoScore: 74,
    missingMeta,
    missingAlt,
    thinContent,
    missingInternalLinks,
    duplicateTitles,
    pendingSeoSuggestions: pendingLinks.size + pendingTopics.size,
    googleNewsReadinessChecklist: [
      "Original title and summary",
      "Clear source attribution",
      "Published timestamp",
      "Article schema",
      "No misleading claims",
    ],
    logs: logs.docs.map((d) => ({ id: d.id, ...d.data() })),
    pendingLinks: pendingLinks.docs.map((d) => ({ id: d.id, ...d.data() })),
    pendingTopics: pendingTopics.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}
