import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import slugify from "slugify";
import { getAutomationSettings, getCategoryById } from "@/lib/automation/server-db";
import { getGoogleTrendsSettings, getTrendTopicsByStatus, logTrendAutomation, updateGoogleTrendsSettings, updateTrendTopic } from "./server-db";

export async function publishTrendArticle(trendId: string): Promise<string> {
  const db = getAdminDb();
  const trendDoc = await db.collection("trendTopics").doc(trendId).get();
  if (!trendDoc.exists) throw new Error("Trend not found");

  const trend = trendDoc.data()!;
  const aiOutput = trend.aiOutput as Record<string, unknown> | null;
  if (!aiOutput?.titleEn || !aiOutput?.contentHi) {
    throw new Error("No generated article content to publish");
  }

  if (trend.isTestRecord) {
    throw new Error("Test trend records cannot be auto-published");
  }

  const category = await getCategoryById(String(trend.mappedCategoryId));
  const automation = await getAutomationSettings();
  const gtSettings = await getGoogleTrendsSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app";
  const slug = slugify(String(aiOutput.titleEn || aiOutput.titleHi), { lower: true, strict: true });

  const newsData = {
    titleHi: aiOutput.titleHi,
    titleEn: aiOutput.titleEn,
    slug,
    summaryHi: aiOutput.summaryHi,
    summaryEn: aiOutput.summaryEn,
    contentHi: aiOutput.contentHi,
    contentEn: aiOutput.contentEn,
    categoryId: trend.mappedCategoryId,
    categoryNameHi: (category as { nameHi?: string })?.nameHi || "देश",
    categoryNameEn: (category as { nameEn?: string })?.nameEn || "India",
    imageUrl: trend.imageUrl || automation.defaultCategoryImage,
    imageAltHi: aiOutput.imageAltHi || aiOutput.titleHi,
    imageAltEn: aiOutput.imageAltEn || aiOutput.titleEn,
    imageLargeUrl: trend.imageLargeUrl,
    imageMediumUrl: trend.imageMediumUrl,
    imageThumbnailUrl: trend.imageThumbnailUrl,
    imageOrigin: trend.imageOrigin,
    author: automation.defaultAuthorName,
    sourceName: "Verified Sources",
    sourceUrl: String(trend.sourceUrl || ""),
    sourceCreditText: aiOutput.sourceCreditText || "Multiple verified sources",
    tags: Array.isArray(aiOutput.tags) ? aiOutput.tags : [],
    language: "hi",
    status: "published",
    isBreaking: false,
    isFeatured: false,
    isTrending: true,
    views: 0,
    seoTitle: aiOutput.seoTitleHi,
    seoDescription: aiOutput.seoDescriptionHi,
    seoTitleHi: aiOutput.seoTitleHi,
    seoTitleEn: aiOutput.seoTitleEn,
    seoDescriptionHi: aiOutput.seoDescriptionHi,
    seoDescriptionEn: aiOutput.seoDescriptionEn,
    seoFaqItems: aiOutput.seoFaqItems || [],
    canonicalUrl: `${siteUrl}/article/${slug}`,
    isAutomated: true,
    trendTopicId: trendId,
    factCheckNotes: aiOutput.factCheckNotes,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("news").add(newsData);

  await updateTrendTopic(trendId, {
    status: "published",
    articleId: ref.id,
  });

  await logTrendAutomation({
    type: "publish",
    trendId,
    message: `Published: ${aiOutput.titleEn}`,
    status: "published",
  });

  try {
    const { enrichArticleOnPublish } = await import("@/lib/article-enrichment/on-publish");
    // Trends already have FAQ — still ensure links + push + meta/social.
    // When GT auto-post is on we publish to social immediately below, so skip the daily queue path here.
    await enrichArticleOnPublish(ref.id, {
      sendPush: true,
      queueSocial: !gtSettings.autoPostToSocial,
      forceFaq: !(Array.isArray(aiOutput.seoFaqItems) && (aiOutput.seoFaqItems as unknown[]).length >= 3),
    });
  } catch (err) {
    console.error("enrich on trend publish failed:", err);
  }

  if (gtSettings.autoPostToSocial) {
    try {
      const { autoPublishArticleToSocialNow } = await import("@/lib/ai-social/service");
      const social = await autoPublishArticleToSocialNow(ref.id, { createdBy: "google-trends-auto" });
      await logTrendAutomation({
        type: "publish",
        trendId,
        message: social.published
          ? `Auto-posted to social: ${social.platforms.join(", ")}`
          : `Social auto-post skipped: ${social.skipped || "no eligible accounts"}`,
        status: social.published ? "published" : "skipped",
      });
    } catch (err) {
      console.error("auto social publish on trend publish failed:", err);
      await logTrendAutomation({
        type: "error",
        trendId,
        message: `Social auto-post failed: ${err instanceof Error ? err.message : "unknown error"}`,
        status: "failed",
      });
    }
  }

  return ref.id;
}

export async function runPublishTrendArticles(limit = 3) {
  const settings = await getGoogleTrendsSettings();
  if (!settings.enabled) return { published: 0, message: "Disabled" };

  const pending = await getTrendTopicsByStatus("pendingApproval", limit);
  const ready = await getTrendTopicsByStatus("processing", limit);
  const topics = [...ready, ...pending].filter((t) => !t.isTestRecord);

  let published = 0;
  for (const trend of topics.slice(0, limit)) {
    try {
      if (trend.riskLevel === "high" && settings.highRiskAlwaysApproval) continue;
      if (trend.status === "pendingApproval") continue;

      await publishTrendArticle(trend.id);
      published += 1;
    } catch (err) {
      await logTrendAutomation({
        type: "error",
        trendId: trend.id,
        message: err instanceof Error ? err.message : "Publish failed",
        status: "failed",
      });
    }
  }

  await updateGoogleTrendsSettings({ lastPublishRun: new Date().toISOString() });
  return { published };
}

export async function approveTrendForPublish(trendId: string) {
  await updateTrendTopic(trendId, { status: "processing" });
  return publishTrendArticle(trendId);
}

export async function rejectTrend(trendId: string, reason?: string) {
  await updateTrendTopic(trendId, {
    status: "rejected",
    errorMessage: reason || "Rejected by admin",
  });
  await logTrendAutomation({
    type: "publish",
    trendId,
    message: reason || "Rejected",
    status: "rejected",
  });
}
