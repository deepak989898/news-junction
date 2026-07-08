import { getAdminDb } from "@/lib/firebase-admin";
import { callAI, estimateCost } from "@/lib/ai-studio/ai-client";
import { getAISettings, getArticleById } from "@/lib/ai-studio/server-db";
import { DEFAULT_EDITORIAL_SETTINGS, EDITORIAL_DISCLAIMER, EDITORIAL_SETTINGS_DOC_ID, EDITORIAL_SYSTEM_PROMPT } from "./defaults";
import {
  EditorialChecklist,
  EditorialDashboard,
  EditorialEntity,
  EditorialIssue,
  EditorialQueueItem,
  EditorialReview,
  EditorialReviewResult,
  EditorialReviewType,
  EditorialScores,
  EditorialSettings,
  EditorialSuggestion,
  SourceConsistencyLabel,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return stripHtml(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let overlap = 0;
  setA.forEach((t) => {
    if (setB.has(t)) overlap += 1;
  });
  const union = new Set([...setA, ...setB]).size;
  return union ? overlap / union : 0;
}

function avgSentenceLength(text: string): number {
  const sentences = stripHtml(text).split(/[.!?।]+/).map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return 0;
  const words = tokenize(text).length;
  return words / sentences.length;
}

function passiveVoiceRatio(text: string): number {
  const words = tokenize(text);
  if (!words.length) return 0;
  const passiveHints = words.filter((w) =>
    ["was", "were", "been", "being", "is", "are", "by", "हुआ", "हुई", "हुए", "गया", "गई", "गए"].includes(w)
  ).length;
  return passiveHints / words.length;
}

function repeatedWordRatio(text: string): number {
  const words = tokenize(text);
  if (!words.length) return 0;
  const counts = new Map<string, number>();
  words.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  let repeats = 0;
  counts.forEach((c) => {
    if (c >= 4) repeats += c;
  });
  return repeats / words.length;
}

function isHighRisk(article: NewsDoc): boolean {
  const hay = `${asString(article.categoryNameEn)} ${asString(article.titleEn)} ${asString(article.summaryEn)} ${asString(article.titleHi)} ${asString(article.summaryHi)}`.toLowerCase();
  return ["politic", "crime", "health", "finance", "religion", "legal", "election", "conflict", "violence", "death", "accident"].some((k) =>
    hay.includes(k)
  );
}

export async function getEditorialSettings(): Promise<EditorialSettings> {
  const doc = await getAdminDb().collection("settings").doc(EDITORIAL_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_EDITORIAL_SETTINGS };
  return { ...DEFAULT_EDITORIAL_SETTINGS, ...(doc.data() as EditorialSettings) };
}

export async function updateEditorialSettings(patch: Partial<EditorialSettings>): Promise<EditorialSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(EDITORIAL_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_EDITORIAL_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  return getEditorialSettings();
}

async function logEditorial(entry: {
  articleId?: string;
  reviewId?: string;
  actionType: string;
  status: "success" | "failed" | "pending";
  message: string;
  provider?: string;
  createdBy?: string;
}) {
  await getAdminDb().collection("editorialLogs").add({ ...entry, createdAt: nowIso() });
}

function emptyScores(): EditorialScores {
  return {
    overall: 0,
    readability: 0,
    seo: 0,
    languageQuality: 0,
    duplicateRisk: 0,
    sourceConsistency: 0,
    translationQuality: 0,
    headlineQuality: 0,
    summaryQuality: 0,
  };
}

function scoreReadability(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  const content = `${asString(article.contentEn)} ${asString(article.contentHi)}`;
  const avgLen = avgSentenceLength(content);
  const passive = passiveVoiceRatio(content);
  const repeats = repeatedWordRatio(content);
  const paragraphs = stripHtml(content).split(/\n+/).filter(Boolean);
  let score = 88;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];

  if (avgLen > 28) {
    score -= 15;
    issues.push({ type: "readability", severity: "medium", message: "Average sentence length appears high; consider shorter sentences." });
    suggestions.push({ type: "readability", message: "Break long sentences into shorter news-style lines." });
  }
  if (passive > 0.18) {
    score -= 12;
    issues.push({ type: "readability", severity: "medium", message: "Possible high passive voice usage detected." });
  }
  if (repeats > 0.12) {
    score -= 10;
    issues.push({ type: "readability", severity: "low", message: "Repeated words may reduce reading flow." });
  }
  if (paragraphs.some((p) => p.length > 700)) {
    score -= 8;
    suggestions.push({ type: "readability", message: "Split oversized paragraphs for better mobile reading." });
  }
  return { score: clamp(score), issues, suggestions };
}

function scoreHeadline(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  const titleEn = asString(article.titleEn);
  const titleHi = asString(article.titleHi);
  const title = titleEn || titleHi;
  let score = 85;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];
  const clickbaitHints = ["shocking", "unbelievable", "must see", "exposed", "sensational", "गुस्सा", "हैरान"];
  if (title.length < 25) {
    score -= 12;
    issues.push({ type: "headline", severity: "medium", message: "Headline may be too short for SEO/clarity." });
  }
  if (title.length > 95) {
    score -= 10;
    issues.push({ type: "headline", severity: "medium", message: "Headline may be too long for SERP display." });
  }
  if (clickbaitHints.some((h) => title.toLowerCase().includes(h))) {
    score -= 20;
    issues.push({ type: "headline", severity: "high", message: "Possible clickbait tone detected in headline." });
    suggestions.push({ type: "headline", message: "Prefer neutral factual phrasing over sensational wording." });
  }
  if (!titleHi || !titleEn) {
    score -= 8;
    issues.push({ type: "headline", severity: "low", message: "Bilingual headline coverage may be incomplete." });
  }
  return { score: clamp(score), issues, suggestions };
}

function scoreSummary(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  const summary = asString(article.summaryEn) || asString(article.summaryHi);
  let score = 82;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];
  if (summary.length < 80) {
    score -= 15;
    issues.push({ type: "summary", severity: "medium", message: "Summary appears incomplete or too short." });
  }
  if (summary.length > 320) {
    score -= 8;
    suggestions.push({ type: "summary", message: "Consider shortening summary for SEO/meta friendliness." });
  }
  return { score: clamp(score), issues, suggestions };
}

function scoreSeo(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  let score = 70;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];
  if (article.seoTitle || article.seoTitleEn || article.seoTitleHi) score += 8;
  else {
    issues.push({ type: "seo", severity: "medium", message: "SEO title appears missing." });
    suggestions.push({ type: "seo", message: "Add SEO title for better SERP relevance." });
  }
  if (article.seoDescription || article.seoDescriptionEn || article.seoDescriptionHi) score += 8;
  else issues.push({ type: "seo", severity: "medium", message: "Meta description appears missing." });
  if (article.slug) score += 4;
  if (Array.isArray(article.tags) && (article.tags as string[]).length >= 3) score += 5;
  else issues.push({ type: "seo", severity: "low", message: "Tags may be insufficient." });
  if (article.imageAltEn || article.imageAltHi) score += 5;
  else issues.push({ type: "seo", severity: "medium", message: "Image ALT text appears missing." });
  return { score: clamp(score), issues, suggestions };
}

function scoreLanguage(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  const hi = stripHtml(asString(article.contentHi));
  const en = stripHtml(asString(article.contentEn));
  let score = 75;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];
  if (!hi) {
    score -= 12;
    issues.push({ type: "language", severity: "medium", message: "Hindi content may be missing." });
  }
  if (!en) {
    score -= 12;
    issues.push({ type: "language", severity: "medium", message: "English content may be missing." });
  }
  if (hi && en) {
    const ratio = Math.min(hi.length, en.length) / Math.max(hi.length, en.length);
    const translationScore = clamp(ratio * 100);
    if (translationScore < 55) {
      score -= 10;
      issues.push({ type: "translation", severity: "medium", message: "Possible translation length mismatch between HI/EN." });
      suggestions.push({ type: "translation", message: "Review bilingual drafts for completeness and natural wording." });
    }
  }
  return { score: clamp(score), issues, suggestions };
}

function scoreSourceConsistency(article: NewsDoc): {
  score: number;
  label: SourceConsistencyLabel;
  issues: EditorialIssue[];
} {
  const issues: EditorialIssue[] = [];
  let score = 78;
  const sourceName = asString(article.sourceName);
  const sourceUrl = asString(article.sourceUrl);
  const title = asString(article.titleEn) || asString(article.titleHi);
  const summary = asString(article.summaryEn) || asString(article.summaryHi);

  if (!sourceName && !sourceUrl) {
    score -= 25;
    issues.push({
      type: "source_consistency",
      severity: "high",
      message: "Possible inconsistencies detected: source attribution appears missing.",
    });
  }
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    score -= 10;
    issues.push({
      type: "source_consistency",
      severity: "medium",
      message: "Possible inconsistencies detected: source link format may be invalid.",
    });
  }

  const numberInTitle = (title.match(/\d+/g) || []).length;
  const numberInSummary = (summary.match(/\d+/g) || []).length;
  if (numberInTitle > 0 && numberInSummary === 0) {
    score -= 8;
    issues.push({
      type: "source_consistency",
      severity: "medium",
      message: "Possible inconsistencies detected: headline numbers may not appear in summary.",
    });
  }

  let label: SourceConsistencyLabel = "Consistent";
  if (score < 55) label = "Major Difference";
  else if (score < 75) label = "Needs Review";
  return { score: clamp(score), label, issues };
}

function scoreImage(article: NewsDoc): { score: number; issues: EditorialIssue[]; suggestions: EditorialSuggestion[] } {
  let score = 70;
  const issues: EditorialIssue[] = [];
  const suggestions: EditorialSuggestion[] = [];
  if (!asString(article.imageUrl)) {
    score -= 30;
    issues.push({ type: "image", severity: "high", message: "Featured image appears missing." });
  } else score += 15;
  if (!asString(article.imageAltEn) && !asString(article.imageAltHi)) {
    score -= 15;
    issues.push({ type: "image", severity: "medium", message: "Image ALT text appears missing." });
    suggestions.push({ type: "image", message: "Add factual ALT text describing the image context." });
  }
  return { score: clamp(score), issues, suggestions };
}

async function detectDuplicates(article: NewsDoc, settings: EditorialSettings) {
  const snap = await getAdminDb().collection("news").orderBy("updatedAt", "desc").limit(120).get();
  const titleTokens = tokenize(`${asString(article.titleEn)} ${asString(article.titleHi)}`);
  const summaryTokens = tokenize(`${asString(article.summaryEn)} ${asString(article.summaryHi)}`);
  const matches: { articleId: string; title: string; similarity: number; reason: string }[] = [];

  snap.docs.forEach((d) => {
    if (d.id === article.id) return;
    const data = d.data();
    const otherTitle = `${asString(data.titleEn)} ${asString(data.titleHi)}`;
    const otherSummary = `${asString(data.summaryEn)} ${asString(data.summaryHi)}`;
    const titleSim = jaccard(titleTokens, tokenize(otherTitle));
    const summarySim = jaccard(summaryTokens, tokenize(otherSummary));
    const slugDup = asString(data.slug) && asString(data.slug) === asString(article.slug);
    const imageDup =
      asString(data.imageUrl) && asString(article.imageUrl) && asString(data.imageUrl) === asString(article.imageUrl);
    let similarity = Math.max(titleSim, summarySim) * 100;
    let reason = titleSim >= summarySim ? "Similar title" : "Similar summary";
    if (slugDup) {
      similarity = Math.max(similarity, 98);
      reason = "Duplicate slug";
    }
    if (imageDup) {
      similarity = Math.max(similarity, similarity + 8);
      reason = `${reason}; duplicate featured image`;
    }
    if (similarity >= settings.duplicateThreshold * 0.7) {
      matches.push({
        articleId: d.id,
        title: asString(data.titleEn) || asString(data.titleHi),
        similarity: clamp(similarity),
        reason,
      });
    }
  });

  matches.sort((a, b) => b.similarity - a.similarity);
  const top = matches.slice(0, 5);
  const duplicatePercent = top[0]?.similarity || 0;
  const duplicateRiskScore = clamp(100 - duplicatePercent);
  const issues: EditorialIssue[] = [];
  if (duplicatePercent >= settings.duplicateThreshold) {
    issues.push({
      type: "duplicate",
      severity: "high",
      message: `Possible near-duplicate detected (~${duplicatePercent}%). Human review recommended.`,
    });
  } else if (duplicatePercent >= settings.duplicateThreshold * 0.75) {
    issues.push({
      type: "duplicate",
      severity: "medium",
      message: `Possible similar article detected (~${duplicatePercent}%).`,
    });
  }
  return { duplicatePercent, duplicateRiskScore, matches: top, issues };
}

function buildChecklist(article: NewsDoc, scores: EditorialScores, settings: EditorialSettings): EditorialChecklist {
  return {
    headlineReviewed: scores.headlineQuality >= settings.qualityThreshold,
    summaryReviewed: scores.summaryQuality >= settings.qualityThreshold,
    sourceLinkPresent: Boolean(asString(article.sourceUrl) || asString(article.sourceName)),
    imageAvailable: Boolean(asString(article.imageUrl)),
    imageAltAvailable: Boolean(asString(article.imageAltEn) || asString(article.imageAltHi)),
    seoComplete: scores.seo >= settings.qualityThreshold,
    schemaComplete: Boolean(article.seoFaqItems || article.seoTitle || article.seoDescription),
    categoryCorrect: Boolean(asString(article.categoryId)),
    tagsAdded: Array.isArray(article.tags) && (article.tags as string[]).length > 0,
    translationReviewed: scores.translationQuality >= settings.qualityThreshold,
    readyForPublish: scores.overall >= settings.minimumPublishScore,
  };
}

function extractHeuristicEntities(article: NewsDoc): EditorialEntity[] {
  const text = `${asString(article.titleEn)} ${asString(article.summaryEn)} ${stripHtml(asString(article.contentEn))}`.slice(0, 4000);
  const entities: EditorialEntity[] = [];
  const dates = text.match(/\b(?:\d{1,2}\s)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?\d{0,4}|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi) || [];
  dates.slice(0, 6).forEach((v) => entities.push({ type: "date", value: v, confidence: "medium" }));
  const numbers = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
  numbers.slice(0, 8).forEach((v) => entities.push({ type: "number", value: v, confidence: "medium" }));
  const currencies = text.match(/(?:₹|Rs\.?|INR|USD|\$)\s?\d[\d,]*(?:\.\d+)?/gi) || [];
  currencies.slice(0, 5).forEach((v) => entities.push({ type: "currency", value: v, confidence: "medium" }));
  return entities;
}

async function askAiJson(prompt: string) {
  const settings = await getAISettings();
  const { text, tokensUsed } = await callAI(settings, EDITORIAL_SYSTEM_PROMPT, prompt);
  const json = text.match(/\{[\s\S]*\}/)?.[0] || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return { parsed, tokensUsed, provider: settings.provider, cost: estimateCost(settings.provider, tokensUsed), raw: text };
}

async function getCachedReview(articleId: string, reviewType: EditorialReviewType, cacheMinutes: number) {
  if (cacheMinutes <= 0) return null;
  const snap = await getAdminDb()
    .collection("editorialReviews")
    .where("articleId", "==", articleId)
    .where("reviewType", "==", reviewType)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  if (snap.empty) return null;
  const usable = snap.docs.find((d) =>
    ["completed", "approved", "applied", "needs_review"].includes(String(d.data().status || ""))
  );
  if (!usable) return null;
  const createdAt = asString(usable.data().createdAt);
  if (!createdAt) return null;
  const ageMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (ageMin > cacheMinutes) return null;
  return { id: usable.id, ...(usable.data() as Omit<EditorialReview, "id">) };
}

export async function runEditorialReview(args: {
  articleId: string;
  reviewType?: EditorialReviewType;
  createdBy: string;
  force?: boolean;
}): Promise<{ reviewId: string; result: EditorialReviewResult; cached?: boolean }> {
  const reviewType = args.reviewType || "full";
  const settings = await getEditorialSettings();
  if (!args.force) {
    const cached = await getCachedReview(args.articleId, reviewType, settings.cacheMinutes);
    if (cached?.result) {
      return { reviewId: cached.id, result: cached.result as EditorialReviewResult, cached: true };
    }
  }

  await logEditorial({
    articleId: args.articleId,
    actionType: "review_started",
    status: "pending",
    message: `Started ${reviewType} review`,
    createdBy: args.createdBy,
  });

  const articleRaw = await getArticleById(args.articleId);
  if (!articleRaw) throw new Error("Article not found");
  const article = articleRaw as NewsDoc;

  const readability = scoreReadability(article);
  const headline = scoreHeadline(article);
  const summary = scoreSummary(article);
  const seo = scoreSeo(article);
  const language = scoreLanguage(article);
  const source = scoreSourceConsistency(article);
  const image = scoreImage(article);
  const duplicates = await detectDuplicates(article, settings);

  let aiExtras: {
    alternativeHeadlines: string[];
    improvedSummary?: string;
    entities: EditorialEntity[];
    suggestedCategoryName?: string;
    suggestedTagsHi: string[];
    suggestedTagsEn: string[];
    tagsToRemove: string[];
    reviewSummary: string;
    suggestions: EditorialSuggestion[];
  } = {
    alternativeHeadlines: [],
    entities: extractHeuristicEntities(article),
    suggestedTagsHi: [],
    suggestedTagsEn: [],
    tagsToRemove: [],
    reviewSummary: "Heuristic editorial review completed. Human verification recommended.",
    suggestions: [],
  };

  try {
    const ai = await askAiJson(`
Return JSON with keys:
alternativeHeadlines (array of 3 strings),
improvedSummary (string),
entities (array of {type,value,confidence}),
suggestedCategoryName (string),
suggestedTagsHi (array),
suggestedTagsEn (array),
tagsToRemove (array),
reviewSummary (string),
suggestions (array of {type,message,suggestedValue?}).

Article title HI: ${asString(article.titleHi)}
Article title EN: ${asString(article.titleEn)}
Summary HI: ${asString(article.summaryHi)}
Summary EN: ${asString(article.summaryEn)}
Category: ${asString(article.categoryNameEn)} / ${asString(article.categoryNameHi)}
Tags: ${Array.isArray(article.tags) ? (article.tags as string[]).join(", ") : ""}
Source: ${asString(article.sourceName)} ${asString(article.sourceUrl)}
Content excerpt: ${stripHtml(asString(article.contentEn) || asString(article.contentHi)).slice(0, 3500)}

Remind: report only possible issues and suggestions. Do not claim truth/falsehood.
`);
    aiExtras = {
      alternativeHeadlines: Array.isArray(ai.parsed.alternativeHeadlines)
        ? (ai.parsed.alternativeHeadlines as string[]).slice(0, 3)
        : [],
      improvedSummary: asString(ai.parsed.improvedSummary) || undefined,
      entities: Array.isArray(ai.parsed.entities)
        ? ([...(ai.parsed.entities as EditorialEntity[]), ...aiExtras.entities].slice(0, 30) as EditorialEntity[])
        : aiExtras.entities,
      suggestedCategoryName: asString(ai.parsed.suggestedCategoryName) || undefined,
      suggestedTagsHi: Array.isArray(ai.parsed.suggestedTagsHi) ? (ai.parsed.suggestedTagsHi as string[]) : [],
      suggestedTagsEn: Array.isArray(ai.parsed.suggestedTagsEn) ? (ai.parsed.suggestedTagsEn as string[]) : [],
      tagsToRemove: Array.isArray(ai.parsed.tagsToRemove) ? (ai.parsed.tagsToRemove as string[]) : [],
      reviewSummary: asString(ai.parsed.reviewSummary) || aiExtras.reviewSummary,
      suggestions: Array.isArray(ai.parsed.suggestions) ? (ai.parsed.suggestions as EditorialSuggestion[]) : [],
    };
  } catch {
    // heuristic-only fallback is acceptable
  }

  const translationQuality = clamp((language.score + (asString(article.contentHi) && asString(article.contentEn) ? 10 : 0)));
  const scores: EditorialScores = emptyScores();
  scores.readability = readability.score;
  scores.headlineQuality = headline.score;
  scores.summaryQuality = summary.score;
  scores.seo = seo.score;
  scores.languageQuality = language.score;
  scores.sourceConsistency = source.score;
  scores.duplicateRisk = duplicates.duplicateRiskScore;
  scores.translationQuality = translationQuality;
  scores.overall = clamp(
    scores.readability * 0.12 +
      scores.seo * 0.12 +
      scores.languageQuality * 0.12 +
      scores.duplicateRisk * 0.14 +
      scores.sourceConsistency * 0.18 +
      scores.translationQuality * 0.1 +
      scores.headlineQuality * 0.12 +
      scores.summaryQuality * 0.1
  );

  const issues: EditorialIssue[] = [
    ...readability.issues,
    ...headline.issues,
    ...summary.issues,
    ...seo.issues,
    ...language.issues,
    ...source.issues,
    ...image.issues,
    ...duplicates.issues,
  ];
  const suggestions: EditorialSuggestion[] = [
    ...readability.suggestions,
    ...headline.suggestions,
    ...summary.suggestions,
    ...seo.suggestions,
    ...language.suggestions,
    ...image.suggestions,
    ...aiExtras.suggestions,
  ];

  if (isHighRisk(article) && settings.requireHumanReviewForHighRisk) {
    issues.push({
      type: "risk",
      severity: "high",
      message: "High-risk topic indicators detected. Human editorial review is recommended before publishing.",
    });
  }

  const checklist = buildChecklist(article, scores, settings);
  const result: EditorialReviewResult = {
    articleId: args.articleId,
    reviewType,
    scores,
    sourceConsistencyLabel: source.label,
    issues,
    suggestions,
    entities: aiExtras.entities,
    checklist,
    alternativeHeadlines: aiExtras.alternativeHeadlines,
    improvedSummary: aiExtras.improvedSummary,
    suggestedCategoryName: aiExtras.suggestedCategoryName,
    suggestedTagsHi: aiExtras.suggestedTagsHi,
    suggestedTagsEn: aiExtras.suggestedTagsEn,
    tagsToRemove: aiExtras.tagsToRemove,
    duplicatePercent: duplicates.duplicatePercent,
    duplicateMatches: duplicates.matches,
    reviewSummary: aiExtras.reviewSummary,
    disclaimer: EDITORIAL_DISCLAIMER,
  };

  const aiSettings = await getAISettings();
  const payload: Omit<EditorialReview, "id"> = {
    articleId: args.articleId,
    reviewType,
    reviewScore: scores.overall,
    reviewSummary: result.reviewSummary,
    issues,
    suggestions,
    scores,
    entities: result.entities,
    checklist,
    result,
    reviewedBy: args.createdBy,
    provider: aiSettings.provider,
    status: scores.overall < settings.qualityThreshold ? "needs_review" : "completed",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("editorialReviews").add(payload);
  await getAdminDb().collection("news").doc(args.articleId).set(
    {
      editorialScore: scores.overall,
      editorialStatus: payload.status,
      editorialReviewedAt: nowIso(),
      updatedAt: nowIso(),
    },
    { merge: true }
  );

  await logEditorial({
    articleId: args.articleId,
    reviewId: ref.id,
    actionType: "review_completed",
    status: "success",
    message: `Completed ${reviewType} review with score ${scores.overall}`,
    provider: aiSettings.provider,
    createdBy: args.createdBy,
  });

  return { reviewId: ref.id, result };
}

export async function enqueueEditorialReview(args: {
  articleId: string;
  reviewType?: EditorialReviewType;
  createdBy: string;
}) {
  const payload: Omit<EditorialQueueItem, "id"> = {
    articleId: args.articleId,
    reviewType: args.reviewType || "full",
    status: "pending",
    retryCount: 0,
    createdBy: args.createdBy,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("editorialQueue").add(payload);
  await logEditorial({
    articleId: args.articleId,
    actionType: "review_queued",
    status: "pending",
    message: `Queued ${payload.reviewType} review`,
    createdBy: args.createdBy,
  });
  return { id: ref.id, ...payload };
}

export async function processEditorialQueue(limit = 10) {
  const snap = await getAdminDb()
    .collection("editorialQueue")
    .where("status", "in", ["pending", "retrying"])
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  let completed = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const item = doc.data() as EditorialQueueItem;
    await doc.ref.update({ status: "processing", updatedAt: nowIso() });
    try {
      await runEditorialReview({
        articleId: item.articleId,
        reviewType: item.reviewType,
        createdBy: item.createdBy,
        force: true,
      });
      await doc.ref.update({ status: "completed", updatedAt: nowIso() });
      completed += 1;
    } catch (error) {
      const retryCount = Number(item.retryCount || 0) + 1;
      const canRetry = retryCount <= 2;
      await doc.ref.update({
        status: canRetry ? "retrying" : "failed",
        retryCount,
        errorMessage: error instanceof Error ? error.message : "Review failed",
        updatedAt: nowIso(),
      });
      failed += 1;
      await logEditorial({
        articleId: item.articleId,
        actionType: "error",
        status: "failed",
        message: error instanceof Error ? error.message : "Queue processing failed",
        createdBy: item.createdBy,
      });
    }
  }
  return { processed: snap.size, completed, failed };
}

export async function applyEditorialReview(args: {
  articleId: string;
  reviewId?: string;
  action: "approve" | "reject" | "apply_suggestions";
  createdBy: string;
  role: "super_admin" | "editor";
  payload?: Record<string, unknown>;
}) {
  const settings = await getEditorialSettings();
  if (args.role !== "super_admin" && !settings.allowEditorsToApprove) {
    throw new Error("Editors are not allowed to approve editorial reviews");
  }

  if (args.action === "apply_suggestions") {
    const update: Record<string, unknown> = { updatedAt: nowIso() };
    if (args.payload?.titleEn) update.titleEn = args.payload.titleEn;
    if (args.payload?.titleHi) update.titleHi = args.payload.titleHi;
    if (args.payload?.summaryEn) update.summaryEn = args.payload.summaryEn;
    if (args.payload?.summaryHi) update.summaryHi = args.payload.summaryHi;
    if (args.payload?.tags) update.tags = args.payload.tags;
    if (args.payload?.imageAltEn) update.imageAltEn = args.payload.imageAltEn;
    if (args.payload?.imageAltHi) update.imageAltHi = args.payload.imageAltHi;
    if (args.payload?.seoTitle) update.seoTitle = args.payload.seoTitle;
    if (args.payload?.seoDescription) update.seoDescription = args.payload.seoDescription;
    await getAdminDb().collection("news").doc(args.articleId).update(update);
    if (args.reviewId) {
      await getAdminDb().collection("editorialReviews").doc(args.reviewId).update({
        status: "applied",
        updatedAt: nowIso(),
      });
    }
    await logEditorial({
      articleId: args.articleId,
      reviewId: args.reviewId,
      actionType: "changes_applied",
      status: "success",
      message: "Editorial suggestions applied",
      createdBy: args.createdBy,
    });
    return { success: true, status: "applied" };
  }

  const status = args.action === "approve" ? "approved" : "rejected";
  if (args.reviewId) {
    await getAdminDb().collection("editorialReviews").doc(args.reviewId).update({
      status,
      updatedAt: nowIso(),
    });
  }
  await getAdminDb().collection("news").doc(args.articleId).set(
    {
      editorialStatus: status,
      updatedAt: nowIso(),
    },
    { merge: true }
  );
  await logEditorial({
    articleId: args.articleId,
    reviewId: args.reviewId,
    actionType: args.action === "approve" ? "approval" : "rejection",
    status: "success",
    message: `Editorial review ${status}`,
    createdBy: args.createdBy,
  });
  return { success: true, status };
}

export async function getEditorialDashboard(): Promise<EditorialDashboard> {
  const settings = await getEditorialSettings();
  const [reviews, logs, queue] = await Promise.all([
    getAdminDb().collection("editorialReviews").orderBy("createdAt", "desc").limit(150).get(),
    getAdminDb().collection("editorialLogs").orderBy("createdAt", "desc").limit(120).get(),
    getAdminDb().collection("editorialQueue").orderBy("createdAt", "desc").limit(80).get(),
  ]);

  const reviewDocs: Record<string, unknown>[] = reviews.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  const scores = reviewDocs.map((r) => Number(r["reviewScore"] || 0)).filter((n) => n > 0);
  const avgQualityScore = scores.length ? clamp(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const belowThreshold = reviewDocs.filter((r) => Number(r["reviewScore"] || 0) < settings.qualityThreshold).length;
  const waitingReview = reviewDocs.filter((r) =>
    ["needs_review", "pending", "completed"].includes(String(r["status"]))
  ).length;
  const duplicateWarnings = reviewDocs.filter((r) => {
    const result = r["result"] as EditorialReviewResult | undefined;
    return Number(result?.duplicatePercent || 0) >= settings.duplicateThreshold * 0.75;
  }).length;

  let seoIssues = 0;
  let imageIssues = 0;
  let translationIssues = 0;
  let headlineIssues = 0;
  reviewDocs.forEach((r) => {
    const issues = (r["issues"] as EditorialIssue[]) || [];
    if (issues.some((i) => i.type === "seo")) seoIssues += 1;
    if (issues.some((i) => i.type === "image")) imageIssues += 1;
    if (issues.some((i) => i.type === "translation" || i.type === "language")) translationIssues += 1;
    if (issues.some((i) => i.type === "headline")) headlineIssues += 1;
  });

  const topReviewed = reviewDocs
    .slice()
    .sort((a, b) => Number(b["reviewScore"] || 0) - Number(a["reviewScore"] || 0))
    .slice(0, 8)
    .map((r) => ({
      articleId: String(r["articleId"] || ""),
      score: Number(r["reviewScore"] || 0),
      status: String(r["status"] || ""),
    }));

  return {
    avgQualityScore,
    belowThreshold,
    waitingReview,
    duplicateWarnings,
    seoIssues,
    imageIssues,
    translationIssues,
    headlineIssues,
    topReviewed,
    settings,
    reviews: reviewDocs,
    logs: logs.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    queue: queue.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
  };
}
