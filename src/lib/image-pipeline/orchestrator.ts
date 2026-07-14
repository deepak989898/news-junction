import { analyzeArticleSubject, enrichAnalysisWithAi } from "./analysis";
import { decideImageStrategy } from "./decision-engine";
import { getCategoryFallbackUrl, isLogoFallback } from "./fallbacks";
import { isDuplicateImageHash, isDuplicateSourceUrl } from "./duplicate-check";
import { generateOpenAiImage } from "./openai-generate";
import { countDailyOpenAiImages, logImagePipelineAction } from "./logger";
import {
  isUsableFirebaseImageUrl,
  measureImageQuality,
  optimizeAndUploadVariants,
  isSourceLargeEnough,
} from "./optimizer";
import { getImagePipelineSettings } from "./settings";
import { fetchPermittedImageBuffer } from "./source-fetcher";
import { validateImageSelection } from "./validation";
import {
  ArticleImageMetadata,
  ImageOrigin,
  ImagePipelineInput,
  ImagePipelineResult,
} from "./types";

async function hostSourceImage(
  storageId: string,
  sourceUrl: string,
  sourceLink: string,
  settings: Awaited<ReturnType<typeof getImagePipelineSettings>>
): Promise<{ metadata: ArticleImageMetadata | null; qualityScore: number; clarityScore: number }> {
  const fetched = await fetchPermittedImageBuffer(sourceUrl, settings, sourceLink);
  if (!fetched) return { metadata: null, qualityScore: 0, clarityScore: 0 };

  const measured = await measureImageQuality(fetched.buffer);
  if (!isSourceLargeEnough(measured.width, measured.height)) {
    return { metadata: null, qualityScore: measured.qualityScore, clarityScore: measured.clarityScore };
  }
  if (
    measured.width < settings.minimumImageWidth ||
    measured.height < settings.minimumImageHeight
  ) {
    return { metadata: null, qualityScore: measured.qualityScore, clarityScore: measured.clarityScore };
  }

  const uploaded = await optimizeAndUploadVariants(storageId, fetched.buffer);
  return {
    metadata: {
      imageUrl: uploaded.variants.large,
      imageOriginalUrl: sourceUrl,
      imageThumbnailUrl: uploaded.variants.thumbnail,
      imageMediumUrl: uploaded.variants.medium,
      imageLargeUrl: uploaded.variants.large,
      imageWebpUrl: uploaded.variants.webp,
      imageOrigin: "source",
      imageFileHash: uploaded.fileHash,
      imageGeneratedAt: new Date().toISOString(),
    },
    qualityScore: Math.max(uploaded.qualityScore, measured.qualityScore),
    clarityScore: Math.max(uploaded.clarityScore, measured.clarityScore),
  };
}

function buildFallbackResult(
  input: ImagePipelineInput,
  settings: Awaited<ReturnType<typeof getImagePipelineSettings>>,
  analysis: Awaited<ReturnType<typeof analyzeArticleSubject>>,
  reason: string
): ImagePipelineResult {
  const fallbackUrl = getCategoryFallbackUrl(input.categoryId, settings);
  return {
    metadata: {
      imageUrl: fallbackUrl,
      imageOrigin: "fallback",
      imageStatus: isLogoFallback(fallbackUrl) ? "fallback" : "approved",
      imageLicence: "News Junction category fallback",
      imageGeneratedAt: new Date().toISOString(),
      imageAnalysis: analysis,
      imagePrompt: reason,
    },
    generated: false,
    source: "fallback",
    strategy: "category_fallback",
    requiresManualReview: analysis.isRealPersonPrimary && isLogoFallback(fallbackUrl),
  };
}

export async function resolveArticleImage(input: ImagePipelineInput): Promise<ImagePipelineResult> {
  const settings = await getImagePipelineSettings();

  if (isUsableFirebaseImageUrl(input.generatedImageUrl || "")) {
    return {
      metadata: {
        imageUrl: input.generatedImageUrl!,
        imageOrigin: "cached",
        imageStatus: "approved",
        imageGeneratedAt: new Date().toISOString(),
      },
      generated: true,
      source: "cached",
      strategy: "licensed_source_image",
      requiresManualReview: false,
    };
  }

  let analysis = analyzeArticleSubject(input);
  if (!input.skipOpenAiImage) {
    analysis = await enrichAnalysisWithAi(input, analysis);
  }
  analysis = decideImageStrategy(analysis, input, settings);

  await logImagePipelineAction({
    type: "resolve",
    articleId: input.articleId,
    rawNewsId: input.rawNewsId,
    strategy: analysis.imageStrategy,
    message: analysis.reason,
    metadata: { subjectType: analysis.subjectType, isRealPersonPrimary: analysis.isRealPersonPrimary },
  });

  const storageId = input.rawNewsId || input.articleId;
  let attempt = 0;
  const maxAttempts = 1 + settings.maximumRetries;

  while (attempt < maxAttempts) {
    attempt += 1;
    let metadata: ArticleImageMetadata | null = null;
    let qualityScore = 0;
    let clarityScore = 0;
    let origin: ImageOrigin = "fallback";
    let prompt: string | undefined;
    let strategy = analysis.imageStrategy;

    const trySource =
      strategy === "licensed_source_image" ||
      (input.preferHostedFirst && input.originalImage);

    if (trySource && input.originalImage && settings.allowSourceImages) {
      const dupUrl = await isDuplicateSourceUrl(input.originalImage, input.articleId);
      if (!dupUrl) {
        const hosted = await hostSourceImage(storageId, input.originalImage, input.originalLink, settings);
        if (hosted.metadata) {
          metadata = {
            ...hosted.metadata,
            imageSourceName: input.sourceName,
            imageSourcePageUrl: input.originalLink,
            imageLicence: input.sourceTrustLevel === "high" ? "source_feed_permitted" : "source_feed_medium_trust",
            imageCredit: input.sourceName,
          };
          qualityScore = hosted.qualityScore;
          clarityScore = hosted.clarityScore;
          origin = "source";
        }
      }
    }

    if (
      !metadata &&
      !input.skipOpenAiImage &&
      settings.openAiImageEnabled &&
      settings.generateImagesAutomatically
    ) {
      const dailyCount = await countDailyOpenAiImages();
      const canUseOpenAi = dailyCount < settings.maximumDailyImages;

      const useNeutral =
        Boolean(input.forceNeutralAi) ||
        (settings.realPersonAiImageDisabled && analysis.isRealPersonPrimary) ||
        (strategy === "neutral_illustration" && !analysis.isRealPersonPrimary);

      const useOpenAi =
        canUseOpenAi &&
        (strategy === "openai_generated" ||
          strategy === "neutral_illustration" ||
          (analysis.isRealPersonPrimary && !settings.realPersonAiImageDisabled));

      if (useOpenAi && strategy !== "licensed_source_image") {
        try {
          const generated = await generateOpenAiImage(
            input,
            analysis,
            storageId,
            useNeutral && !analysis.isRealPersonPrimary
          );
          prompt = generated.prompt;
          if (generated.url && isUsableFirebaseImageUrl(generated.url)) {
            const dup = generated.fileHash
              ? await isDuplicateImageHash(generated.fileHash, input.articleId)
              : { duplicate: false };
            if (!dup.duplicate) {
              metadata = {
                imageUrl: generated.url,
                imageLargeUrl: generated.url,
                imageMediumUrl: generated.url,
                imageWebpUrl: generated.url,
                imageOrigin: "openai",
                imagePrompt: prompt,
                imageProvider: "openai",
                imageFileHash: generated.fileHash,
                imageGeneratedAt: new Date().toISOString(),
                imageRelevanceScore: generated.storyScore,
                imageQualityScore: generated.visionScore ?? generated.clarityScore ?? 85,
              };
              origin = "openai";
              qualityScore = generated.visionScore ?? generated.clarityScore ?? 85;
              clarityScore = generated.clarityScore ?? 82;
            }
          }
          await logImagePipelineAction({
            type: "generate",
            articleId: input.articleId,
            rawNewsId: input.rawNewsId,
            origin: "openai",
            message: generated.skippedReason
              ? `OpenAI skipped: ${generated.skippedReason}`
              : useNeutral
                ? "Neutral AI image generated"
                : `OpenAI image generated (story ${generated.storyScore ?? "n/a"}, vision ${generated.visionScore ?? "n/a"})`,
          });
        } catch (err) {
          await logImagePipelineAction({
            type: "reject",
            articleId: input.articleId,
            rawNewsId: input.rawNewsId,
            message: err instanceof Error ? err.message : "OpenAI generation failed",
          });
        }
      }
    }

    if (!metadata && input.originalImage && settings.allowSourceImages && origin !== "source") {
      const hosted = await hostSourceImage(storageId, input.originalImage, input.originalLink, settings);
      if (hosted.metadata) {
        metadata = {
          ...hosted.metadata,
          imageSourceName: input.sourceName,
          imageSourcePageUrl: input.originalLink,
          imageCredit: input.sourceName,
        };
        qualityScore = hosted.qualityScore;
        clarityScore = hosted.clarityScore;
        origin = "source";
      }
    }

    if (!metadata) {
      return buildFallbackResult(input, settings, analysis, "No permitted image found; using category fallback.");
    }

    metadata.imageAnalysis = analysis;

    const validation = validateImageSelection({
      input,
      analysis,
      imageOrigin: origin,
      imagePrompt: prompt || analysis.factualVisualSummary,
      qualityScore: qualityScore || 80,
      clarityScore: clarityScore || 80,
      minimumRelevanceScore: settings.minimumRelevanceScore,
      minimumQualityScore: settings.minimumQualityScore,
      minimumClarityScore: settings.minimumClarityScore,
    });

    metadata.imageValidation = validation;
    metadata.imageRelevanceScore = validation.relevanceScore;
    metadata.imageQualityScore = validation.qualityScore;
    metadata.imageStatus = validation.approved ? "approved" : "rejected";

    if (validation.approved) {
      const requiresManualReview =
        settings.manualReviewForHighRisk &&
        (analysis.riskLevel === "high" || validation.personMismatchRisk === "medium");

      if (requiresManualReview) metadata.imageStatus = "manualReview";

      await logImagePipelineAction({
        type: "validate",
        articleId: input.articleId,
        rawNewsId: input.rawNewsId,
        origin,
        message: `Approved relevance=${validation.relevanceScore} quality=${validation.qualityScore}`,
      });

      return {
        metadata,
        generated: origin !== "fallback",
        source: origin,
        strategy: analysis.imageStrategy,
        requiresManualReview: Boolean(requiresManualReview),
      };
    }

    await logImagePipelineAction({
      type: "reject",
      articleId: input.articleId,
      rawNewsId: input.rawNewsId,
      message: validation.rejectionReasons.join("; ") || "Validation failed",
    });

    if (attempt >= maxAttempts) break;
    analysis = { ...analysis, imageStrategy: "neutral_illustration" };
  }

  return buildFallbackResult(input, settings, analysis, "Validation failed after retries; category fallback assigned.");
}

/** Legacy-compatible wrapper for automation pipeline */
export async function resolveAutomationArticleImage(params: {
  rawNewsId: string;
  originalImage: string;
  generatedImageUrl?: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi?: string;
  categoryId: string;
  categoryNameEn: string;
  categoryNameHi?: string;
  sourceName?: string;
  sourceUrl?: string;
  originalLink?: string;
  sourceTrustLevel?: "low" | "medium" | "high";
  sourceAllowsImageReuse?: boolean;
  fallbackImage: string;
  generateAiImages: boolean;
  preferHostedFirst?: boolean;
  skipOpenAiImage?: boolean;
  articleId?: string;
}): Promise<{
  imageUrl: string;
  generated: boolean;
  source: "cached" | "ai" | "hosted" | "fallback";
  metadata?: ArticleImageMetadata;
  requiresManualReview?: boolean;
}> {
  const settings = await getImagePipelineSettings();
  settings.generateImagesAutomatically = params.generateAiImages && !params.skipOpenAiImage;
  settings.defaultCategoryImage = params.fallbackImage;

  const result = await resolveArticleImage({
    articleId: params.articleId || params.rawNewsId,
    rawNewsId: params.rawNewsId,
    titleEn: params.titleEn,
    titleHi: params.titleHi,
    summaryEn: params.summaryEn,
    summaryHi: params.summaryHi || "",
    categoryId: params.categoryId,
    categoryNameEn: params.categoryNameEn,
    categoryNameHi: params.categoryNameHi || "",
    sourceName: params.sourceName || "",
    sourceUrl: params.sourceUrl || "",
    originalLink: params.originalLink || params.sourceUrl || "",
    originalImage: params.originalImage,
    generatedImageUrl: params.generatedImageUrl,
    sourceTrustLevel: params.sourceTrustLevel || "medium",
    sourceAllowsImageReuse: params.sourceAllowsImageReuse ?? true,
    preferHostedFirst: params.preferHostedFirst || params.skipOpenAiImage,
    skipOpenAiImage: params.skipOpenAiImage,
  });

  const legacySourceMap: Record<string, "cached" | "ai" | "hosted" | "fallback"> = {
    cached: "cached",
    openai: "ai",
    source: "hosted",
    official: "hosted",
    fallback: "fallback",
    admin: "hosted",
    commons: "hosted",
    stock: "hosted",
  };

  return {
    imageUrl: result.metadata.imageUrl,
    generated: result.generated,
    source: legacySourceMap[result.source] || "fallback",
    metadata: result.metadata,
    requiresManualReview: result.requiresManualReview,
  };
}

export async function generateAutomationArticleImage(params: {
  rawNewsId: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi?: string;
  categoryId: string;
  categoryNameEn: string;
  categoryNameHi?: string;
  sourceName?: string;
  forceNeutral?: boolean;
}): Promise<{
  url: string | null;
  prompt: string;
  storyScore?: number;
  visionScore?: number;
  clarityScore?: number;
  skippedReason?: string;
}> {
  const analysis = analyzeArticleSubject({
    articleId: params.rawNewsId,
    rawNewsId: params.rawNewsId,
    titleEn: params.titleEn,
    titleHi: params.titleHi,
    summaryEn: params.summaryEn,
    summaryHi: params.summaryHi || "",
    categoryId: params.categoryId,
    categoryNameEn: params.categoryNameEn,
    categoryNameHi: params.categoryNameHi || "",
    sourceName: params.sourceName || "",
    sourceUrl: "",
    originalLink: "",
    originalImage: "",
  });

  const generated = await generateOpenAiImage(
    {
      articleId: params.rawNewsId,
      rawNewsId: params.rawNewsId,
      titleEn: params.titleEn,
      titleHi: params.titleHi,
      summaryEn: params.summaryEn,
      summaryHi: params.summaryHi || "",
      categoryId: params.categoryId,
      categoryNameEn: params.categoryNameEn,
      categoryNameHi: params.categoryNameHi || "",
      sourceName: params.sourceName || "",
      sourceUrl: "",
      originalLink: "",
      originalImage: "",
      forceNeutralAi: Boolean(params.forceNeutral),
    },
    analysis,
    params.rawNewsId,
    Boolean(params.forceNeutral)
  );

  return {
    url: generated.url,
    prompt: generated.prompt,
    storyScore: generated.storyScore,
    visionScore: generated.visionScore,
    clarityScore: generated.clarityScore,
    skippedReason: generated.skippedReason,
  };
}
