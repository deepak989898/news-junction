import { getAutomationSettings, getCategoryById } from "@/lib/automation/server-db";
import { resolveAutomationArticleImage } from "@/lib/automation/image-generator";
import { generateTrendArticleFromVerifiedSources } from "./ai-generator";
import {
  countTrendArticlesPublishedToday,
  getGoogleTrendsSettings,
  getTrendSourceCandidates,
  getTrendTopicById,
  getTrendTopicsByStatus,
  logTrendAutomation,
  updateGoogleTrendsSettings,
  updateTrendTopic,
} from "./server-db";
import { toVerifiedContext, verifyTrendSources } from "./verification";
import type { TrendTopic } from "./types";

async function processOneVerifiedTrend(
  trend: TrendTopic,
  counts: { total: number; byCategory: Record<string, number> },
  settings: Awaited<ReturnType<typeof getGoogleTrendsSettings>>,
  automation: Awaited<ReturnType<typeof getAutomationSettings>>
): Promise<{ ok: boolean; articleId?: string; status?: string; message?: string }> {
  const catCount = counts.byCategory[trend.mappedCategoryId] || 0;
  if (counts.total >= settings.maximumArticlesPerDay) {
    return { ok: false, message: "Daily trend article limit reached" };
  }
  if (catCount >= settings.maximumArticlesPerCategoryPerDay) {
    return { ok: false, message: "Category daily limit reached" };
  }

  await updateTrendTopic(trend.id, { status: "processing", errorMessage: "" });

  const candidates = await getTrendSourceCandidates(trend.id);
  const verification = verifyTrendSources(trend.title, candidates, settings);
  const context = toVerifiedContext(trend.id, verification);
  if (!context) {
    await updateTrendTopic(trend.id, {
      status: "insufficientSources",
      errorMessage: "Re-verification failed at process stage",
    });
    return { ok: false, message: "Insufficient verified sources" };
  }

  const aiOutput = await generateTrendArticleFromVerifiedSources(trend, context);

  const category = await getCategoryById(trend.mappedCategoryId);
  const categoryNameEn = (category as { nameEn?: string })?.nameEn || "India";
  const categoryNameHi = (category as { nameHi?: string })?.nameHi || "देश";

  const primarySource = context.sources[0];
  let imageUrl = "";
  let imageMetadata: Record<string, unknown> = {};

  try {
    const imageResult = await resolveAutomationArticleImage({
      rawNewsId: `trend-${trend.id}`,
      originalImage: "",
      titleEn: aiOutput.titleEn,
      titleHi: aiOutput.titleHi,
      summaryEn: aiOutput.summaryEn,
      summaryHi: aiOutput.summaryHi,
      categoryId: trend.mappedCategoryId,
      categoryNameEn,
      categoryNameHi,
      sourceName: primarySource?.sourceName || "Verified Sources",
      sourceUrl: primarySource?.sourceUrl || "",
      originalLink: primarySource?.sourceUrl || "",
      sourceTrustLevel: primarySource?.trustLevel || "medium",
      sourceAllowsImageReuse: true,
      fallbackImage: automation.defaultCategoryImage,
      generateAiImages: automation.generateAiImages !== false,
      articleId: trend.id,
    });
    imageUrl = imageResult.imageUrl;
    imageMetadata = (imageResult.metadata || {}) as Record<string, unknown>;
  } catch {
    imageUrl = automation.defaultCategoryImage;
  }

  const finalRisk = aiOutput.riskLevel === "high" ? "high" : trend.riskLevel;
  const canAutoPublish = !trend.isTestRecord && finalRisk === "low" && settings.autoPublishLowRisk;

  await updateTrendTopic(trend.id, {
    status: canAutoPublish ? "processing" : "pendingApproval",
    aiOutput: { ...aiOutput, seoFaqItems: buildFaqItems(aiOutput) },
    imageUrl,
    riskLevel: finalRisk,
    ...flattenImageMetadata(imageMetadata),
  });

  let articleId: string | undefined;
  if (canAutoPublish) {
    const { publishTrendArticle } = await import("./publish-pipeline");
    articleId = await publishTrendArticle(trend.id);
  }

  await logTrendAutomation({
    type: "generate",
    trendId: trend.id,
    message: `Generated article: ${aiOutput.titleEn}`,
    category: trend.category,
    status: canAutoPublish ? "published" : "pendingApproval",
    estimatedCost: 0.02,
  });

  return {
    ok: true,
    articleId,
    status: canAutoPublish ? "published" : "pendingApproval",
    message: canAutoPublish ? "Published" : "Pending approval",
  };
}

export async function runProcessTrendArticles(limit = 3) {
  const settings = await getGoogleTrendsSettings();
  const automation = await getAutomationSettings();

  if (!settings.enabled) {
    return { processed: 0, message: "Disabled" };
  }

  const counts = await countTrendArticlesPublishedToday();
  if (counts.total >= settings.maximumArticlesPerDay) {
    return { processed: 0, message: "Daily trend article limit reached" };
  }

  const topics = await getTrendTopicsByStatus("verified", limit);
  let processed = 0;

  for (const trend of topics) {
    try {
      const result = await processOneVerifiedTrend(trend, counts, settings, automation);
      if (result.ok) {
        processed += 1;
        counts.total += 1;
        counts.byCategory[trend.mappedCategoryId] = (counts.byCategory[trend.mappedCategoryId] || 0) + 1;
      }
    } catch (err) {
      await updateTrendTopic(trend.id, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Processing failed",
      });
      await logTrendAutomation({
        type: "error",
        trendId: trend.id,
        message: err instanceof Error ? err.message : "Process failed",
        status: "failed",
      });
    }
  }

  await updateGoogleTrendsSettings({ lastProcessRun: new Date().toISOString() });
  return { processed };
}

function buildFaqItems(aiOutput: Record<string, unknown>) {
  const faqHi = (aiOutput.faqHi as Array<{ question: string; answer: string }>) || [];
  const faqEn = (aiOutput.faqEn as Array<{ question: string; answer: string }>) || [];
  return faqHi.map((item, i) => ({
    questionHi: item.question,
    answerHi: item.answer,
    questionEn: faqEn[i]?.question || item.question,
    answerEn: faqEn[i]?.answer || item.answer,
  }));
}

function flattenImageMetadata(metadata: Record<string, unknown>) {
  const allowed = [
    "imageOriginalUrl", "imageThumbnailUrl", "imageMediumUrl", "imageLargeUrl",
    "imageOrigin", "imageRelevanceScore", "imageQualityScore", "imageStatus",
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (metadata[key] !== undefined) out[key] = metadata[key];
  }
  return out;
}

/** Generate article for one specific verified trend (used by admin per-row Generate). */
export async function processTrendById(trendId: string) {
  const settings = await getGoogleTrendsSettings();
  const automation = await getAutomationSettings();
  if (!settings.enabled) {
    throw new Error("Google Trends automation is disabled");
  }

  const trend = await getTrendTopicById(trendId);
  if (!trend) throw new Error("Trend not found");

  if (trend.status === "pendingApproval" || trend.status === "published") {
    throw new Error(`Article already generated (status: ${trend.status})`);
  }

  if (trend.status !== "verified") {
    throw new Error(`Trend must be verified before generation (current: ${trend.status}). Click Research Sources first.`);
  }

  const counts = await countTrendArticlesPublishedToday();
  try {
    const result = await processOneVerifiedTrend(trend, counts, settings, automation);
    await updateGoogleTrendsSettings({ lastProcessRun: new Date().toISOString() });
    if (!result.ok) throw new Error(result.message || "Generation failed");
    return { processed: 1, ...result };
  } catch (err) {
    await updateTrendTopic(trendId, {
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Processing failed",
    });
    throw err;
  }
}

/** @deprecated Prefer processTrendById */
export async function processSingleTrend(trendId: string) {
  return processTrendById(trendId);
}
