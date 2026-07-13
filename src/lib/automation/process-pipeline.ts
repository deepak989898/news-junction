import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getAutomationSettings,
  getRawNewsById,
  getCategoryById,
  publishRawNewsToNews,
  updateRawNews,
  logAutomation,
  countPublishedToday,
} from "./server-db";
import { generateArticleContent } from "./ai-processor";
import { checkDuplicate } from "./duplicate-checker";
import { detectRiskLevel, shouldAutoPublish } from "./risk-detector";
import { resolveAutomationArticleImage, generateAutomationArticleImage } from "./image-generator";
import type { ArticleImageMetadata } from "@/lib/image-pipeline/types";
import { analyzeArticleSubject } from "@/lib/image-pipeline/analysis";
import { RawNewsStatus } from "./types";
import { detectArticleLocation, geoFieldsToFirestore } from "@/lib/location/service";
import {
  getDailyNewsDistribution,
  shouldDeferInternationalArticle,
} from "@/lib/location/quota";

function buildGeoForArticle(
  aiOutput: { titleHi: string; titleEn: string; summaryHi: string; summaryEn: string },
  categoryId: string,
  sourceData?: Record<string, unknown>
) {
  const geo = detectArticleLocation({
    titleHi: aiOutput.titleHi,
    titleEn: aiOutput.titleEn,
    summaryHi: aiOutput.summaryHi,
    summaryEn: aiOutput.summaryEn,
    categoryId,
    sourceName: sourceData?.name as string | undefined,
    sourceStateId: sourceData?.stateId as string | undefined,
  });
  return { geo, geoFields: geoFieldsToFirestore(geo) };
}

async function resolveImageForRawItem(
  rawNewsId: string,
  rawItem: {
    originalImage: string;
    generatedImageUrl?: string;
    categoryId: string;
    sourceName?: string;
    sourceUrl?: string;
    originalLink?: string;
    sourceId?: string;
  },
  aiOutput: { titleEn: string; titleHi: string; summaryEn: string; summaryHi?: string },
  categoryNameEn: string,
  categoryNameHi?: string,
  options?: { preferHostedImage?: boolean; articleId?: string }
): Promise<{ imageUrl: string; generated: boolean; metadata?: ArticleImageMetadata; requiresManualReview?: boolean }> {
  const settings = await getAutomationSettings();

  let sourceTrustLevel: "low" | "medium" | "high" = "medium";
  if (rawItem.sourceId) {
    const sourceDoc = await getAdminDb().collection("sources").doc(rawItem.sourceId).get();
    if (sourceDoc.exists) {
      sourceTrustLevel = (sourceDoc.data()?.trustLevel as "low" | "medium" | "high") || "medium";
    }
  }

  const result = await resolveAutomationArticleImage({
    rawNewsId,
    originalImage: rawItem.originalImage,
    generatedImageUrl: rawItem.generatedImageUrl,
    titleEn: aiOutput.titleEn,
    titleHi: aiOutput.titleHi,
    summaryEn: aiOutput.summaryEn,
    summaryHi: aiOutput.summaryHi || "",
    categoryId: rawItem.categoryId,
    categoryNameEn,
    categoryNameHi,
    sourceName: rawItem.sourceName || "",
    sourceUrl: rawItem.sourceUrl || "",
    originalLink: rawItem.originalLink || rawItem.sourceUrl || "",
    sourceTrustLevel,
    sourceAllowsImageReuse: sourceTrustLevel !== "low",
    fallbackImage: settings.defaultCategoryImage,
    generateAiImages: settings.generateAiImages !== false,
    preferHostedFirst: options?.preferHostedImage,
    articleId: options?.articleId,
  });

  return {
    imageUrl: result.imageUrl,
    generated: result.generated,
    metadata: result.metadata,
    requiresManualReview: result.requiresManualReview,
  };
}

function applyImageMetadataToNewsUpdate(metadata?: ArticleImageMetadata): Record<string, unknown> {
  if (!metadata) return {};
  const update: Record<string, unknown> = {};
  const fields: (keyof ArticleImageMetadata)[] = [
    "imageOriginalUrl",
    "imageThumbnailUrl",
    "imageMediumUrl",
    "imageLargeUrl",
    "imageWebpUrl",
    "imageCredit",
    "imageSourceName",
    "imageSourcePageUrl",
    "imageLicence",
    "imageOrigin",
    "imageProvider",
    "imagePrompt",
    "imageRelevanceScore",
    "imageQualityScore",
    "imageStatus",
    "focalPointX",
    "focalPointY",
    "imageGeneratedAt",
    "imageFileHash",
  ];
  for (const key of fields) {
    if (metadata[key] !== undefined) update[key] = metadata[key];
  }
  return update;
}

export async function processRawNewsItem(
  rawNewsId: string,
  options?: { preferHostedImage?: boolean }
): Promise<{
  status: RawNewsStatus;
  newsId?: string;
  message: string;
}> {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return { status: "fetched", message: "Automation disabled" };
  }

  const rawItem = await getRawNewsById(rawNewsId);
  if (!rawItem) return { status: "failed", message: "Raw news not found" };

  await updateRawNews(rawNewsId, { status: "processing" });

  try {
    const dupCheck = await checkDuplicate(
      rawItem.originalLink,
      rawItem.originalTitle,
      settings.duplicateThreshold,
      rawNewsId
    );

    if (dupCheck.isDuplicate) {
      await updateRawNews(rawNewsId, {
        status: "duplicate",
        duplicateScore: dupCheck.duplicateScore,
        errorMessage: dupCheck.reason,
      });
      await logAutomation({
        type: "process",
        message: `Duplicate: ${dupCheck.reason}`,
        rawNewsId,
        sourceId: rawItem.sourceId,
        status: "duplicate",
      });
      return { status: "duplicate", message: dupCheck.reason || "Duplicate detected" };
    }

    const aiOutput = await generateArticleContent(settings.aiProvider, {
      title: rawItem.originalTitle,
      summary: rawItem.originalSummary,
      sourceLink: rawItem.originalLink,
      sourceName: rawItem.sourceName,
      categoryId: rawItem.categoryId,
      language: rawItem.language,
    });

    const detectedRisk = detectRiskLevel(
      rawItem.originalTitle,
      rawItem.originalSummary,
      rawItem.categoryId
    );
    const finalRisk = aiOutput.riskLevel === "high" ? "high" : detectedRisk;
    aiOutput.riskLevel = finalRisk;

    const categoryId = aiOutput.suggestedCategory || rawItem.categoryId;
    const category = await getCategoryById(categoryId);
    const catData = category || {
      id: rawItem.categoryId,
      nameHi: "देश",
      nameEn: "India",
    };
    const categoryNameEn = (catData as { nameEn?: string }).nameEn || "India";

    const publishedCounts = await countPublishedToday();
    const categoryCount = publishedCounts.byCategory[categoryId] || 0;

    const canPublish =
      publishedCounts.total < settings.maxArticlesPerDay &&
      categoryCount < settings.maxArticlesPerCategoryPerDay;

    const sourceDoc = await getAdminDb().collection("sources").doc(rawItem.sourceId).get();
    const sourceData = sourceDoc.exists ? (sourceDoc.data() as Record<string, unknown>) : undefined;
    const sourceAutoPublish = sourceDoc.exists
      ? Boolean(sourceData?.autoPublishAllowed)
      : false;

    const { geo, geoFields } = buildGeoForArticle(aiOutput, categoryId, sourceData);
    const distribution = await getDailyNewsDistribution();
    const intlDefer = shouldDeferInternationalArticle(geo.geoScope, geo.isIndiaNews, distribution);

    let autoPublish = canPublish &&
      shouldAutoPublish(finalRisk, sourceAutoPublish, settings) &&
      aiOutput.titleHi && aiOutput.contentHi &&
      !intlDefer.defer;

    await updateRawNews(rawNewsId, {
      aiOutput,
      riskLevel: finalRisk,
      categoryId,
      status: autoPublish ? "processing" : "pendingApproval",
      geoScope: geo.geoScope,
      geoConfidence: geo.geoConfidence,
      isIndiaNews: geo.isIndiaNews,
      ...(intlDefer.defer ? { errorMessage: intlDefer.reason } : {}),
    });

    if (autoPublish) {
      const imageResult = await resolveImageForRawItem(
        rawNewsId,
        { ...rawItem, categoryId },
        aiOutput,
        categoryNameEn,
        (catData as { nameHi?: string }).nameHi,
        options
      );
      const { imageUrl, generated, metadata } = imageResult;
      if (generated && imageUrl !== settings.defaultCategoryImage) {
        await updateRawNews(rawNewsId, { generatedImageUrl: imageUrl });
      }

      const newsId = await publishRawNewsToNews(rawNewsId, aiOutput, {
        sourceName: rawItem.sourceName,
        sourceUrl: rawItem.sourceUrl,
        originalLink: rawItem.originalLink,
        categoryId: catData.id as string,
        categoryNameHi: (catData as { nameHi?: string }).nameHi || "देश",
        categoryNameEn,
        imageUrl,
        imageMetadata: metadata,
        author: settings.defaultAuthorName,
        publish: true,
        geoFields,
      });

      await logAutomation({
        type: "publish",
        message: `Auto-published: ${aiOutput.titleEn}`,
        rawNewsId,
        newsId,
        sourceId: rawItem.sourceId,
        status: "published",
      });

      return { status: "published", newsId, message: "Auto-published successfully" };
    }

    await updateRawNews(rawNewsId, { status: "pendingApproval", aiOutput, riskLevel: finalRisk });

    await logAutomation({
      type: "process",
      message: `Pending approval (${finalRisk} risk): ${aiOutput.titleEn}`,
      rawNewsId,
      sourceId: rawItem.sourceId,
      status: "pendingApproval",
    });

    return { status: "pendingApproval", message: "Sent to approval queue" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await updateRawNews(rawNewsId, { status: "failed", errorMessage: message });
    await logAutomation({
      type: "error",
      message,
      rawNewsId,
      sourceId: rawItem.sourceId,
      status: "failed",
    });
    return { status: "failed", message };
  }
}

export async function approveAndPublishRawNews(rawNewsId: string): Promise<string> {
  const settings = await getAutomationSettings();
  const rawItem = await getRawNewsById(rawNewsId);
  if (!rawItem || !rawItem.aiOutput) throw new Error("No AI content to publish");

  const category = await getCategoryById(rawItem.categoryId);
  const categoryNameEn = (category as { nameEn?: string })?.nameEn || "India";

  const imageResult = await resolveImageForRawItem(
    rawNewsId,
    rawItem,
    rawItem.aiOutput,
    categoryNameEn,
    (category as { nameHi?: string })?.nameHi
  );
  const { imageUrl, generated, metadata } = imageResult;

  if (generated && imageUrl !== settings.defaultCategoryImage) {
    await updateRawNews(rawNewsId, { generatedImageUrl: imageUrl });
  }

  const { geoFields } = buildGeoForArticle(rawItem.aiOutput, rawItem.categoryId);

  const newsId = await publishRawNewsToNews(rawNewsId, rawItem.aiOutput, {
    sourceName: rawItem.sourceName,
    sourceUrl: rawItem.sourceUrl,
    originalLink: rawItem.originalLink,
    categoryId: rawItem.categoryId,
    categoryNameHi: (category as { nameHi?: string })?.nameHi || "देश",
    categoryNameEn,
    imageUrl,
    imageMetadata: metadata,
    author: settings.defaultAuthorName,
    publish: true,
    geoFields,
  });

  await logAutomation({
    type: "publish",
    message: `Manually approved: ${rawItem.aiOutput.titleEn}`,
    rawNewsId,
    newsId,
    sourceId: rawItem.sourceId,
    status: "published",
  });

  return newsId;
}

export async function repairPublishedNewsImage(newsId: string): Promise<{
  imageUrl: string;
  source: "cached" | "ai" | "hosted" | "fallback";
}> {
  const db = getAdminDb();
  const newsDoc = await db.collection("news").doc(newsId).get();
  if (!newsDoc.exists) throw new Error("News article not found");

  const newsData = newsDoc.data()!;
  const rawNewsId = newsData.automationRawNewsId as string | undefined;
  if (!rawNewsId) throw new Error("Article is not from automation");

  const rawItem = await getRawNewsById(rawNewsId);
  if (!rawItem?.aiOutput) throw new Error("Linked raw news has no AI content");

  const category = await getCategoryById(rawItem.categoryId);
  const categoryNameEn = (category as { nameEn?: string })?.nameEn || "India";

  const imageResult = await resolveImageForRawItem(
    rawNewsId,
    rawItem,
    rawItem.aiOutput,
    categoryNameEn,
    (category as { nameHi?: string })?.nameHi,
    { articleId: newsId }
  );
  const { imageUrl, metadata } = imageResult;
  const settings = await getAutomationSettings();
  if (imageUrl !== settings.defaultCategoryImage) {
    await db.collection("news").doc(newsId).update({
      imageUrl,
      ...applyImageMetadataToNewsUpdate(metadata),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await updateRawNews(rawNewsId, { generatedImageUrl: imageUrl });
  }

  return { imageUrl, source: metadata?.imageOrigin === "openai" ? "ai" : metadata?.imageOrigin === "source" ? "hosted" : "fallback" };
}

export async function regenerateArticleImage(
  newsId: string,
  overrides?: {
    titleEn?: string;
    titleHi?: string;
    summaryEn?: string;
    categoryId?: string;
  }
): Promise<{ imageUrl: string; source: "ai" }> {
  const settings = await getAutomationSettings();
  if (settings.generateAiImages === false) {
    throw new Error("AI image generation is disabled. Enable it in Automation Settings.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const db = getAdminDb();
  const newsDoc = await db.collection("news").doc(newsId).get();
  if (!newsDoc.exists) throw new Error("News article not found");
  const newsData = newsDoc.data()!;

  const titleEn = (overrides?.titleEn || String(newsData.titleEn || newsData.titleHi || "")).trim();
  const titleHi = (overrides?.titleHi || String(newsData.titleHi || newsData.titleEn || "")).trim();
  const summaryEn = (overrides?.summaryEn || String(newsData.summaryEn || newsData.summaryHi || "")).trim().slice(0, 500);
  const categoryId = overrides?.categoryId || String(newsData.categoryId || "desh");

  if (!titleEn && !titleHi) throw new Error("Article title is required to generate an image");

  const category = await getCategoryById(categoryId);
  const categoryNameEn = (category as { nameEn?: string })?.nameEn || "India";

  const linkedRawNewsId = newsData.automationRawNewsId as string | undefined;
  const storageId = linkedRawNewsId || `manual-${newsId}`;

  if (linkedRawNewsId) {
    await updateRawNews(linkedRawNewsId, { generatedImageUrl: FieldValue.delete() });
  }

  const analysis = analyzeArticleSubject({
    articleId: newsId,
    rawNewsId: storageId,
    titleEn: titleEn || titleHi,
    titleHi: titleHi || titleEn,
    summaryEn: summaryEn || titleEn,
    summaryHi: String(newsData.summaryHi || ""),
    categoryId,
    categoryNameEn,
    categoryNameHi: String(newsData.categoryNameHi || ""),
    sourceName: String(newsData.sourceName || ""),
    sourceUrl: String(newsData.sourceUrl || ""),
    originalLink: String(newsData.sourceUrl || ""),
    originalImage: "",
  });

  if (analysis.isRealPersonPrimary) {
    throw new Error(
      "Real-person article: AI face generation is disabled. Use a licensed or official image, or upload manually."
    );
  }

  const generated = await generateAutomationArticleImage({
    rawNewsId: storageId,
    titleEn: titleEn || titleHi,
    titleHi: titleHi || titleEn,
    summaryEn: summaryEn || titleEn,
    summaryHi: String(newsData.summaryHi || ""),
    categoryId,
    categoryNameEn,
    forceNeutral: false,
  });

  if (!generated) {
    throw new Error("AI image generation failed. Please try again.");
  }

  await db.collection("news").doc(newsId).update({
    imageUrl: generated,
    imageOrigin: "openai",
    imageStatus: "approved",
    imageGeneratedAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (linkedRawNewsId) {
    await updateRawNews(linkedRawNewsId, { generatedImageUrl: generated });
  }

  return { imageUrl: generated, source: "ai" };
}

export async function rejectRawNews(rawNewsId: string, reason?: string) {
  await updateRawNews(rawNewsId, {
    status: "rejected",
    errorMessage: reason || "Rejected by admin",
  });
  await logAutomation({
    type: "process",
    message: reason || "Rejected by admin",
    rawNewsId,
    status: "rejected",
  });
}
