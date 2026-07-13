import { ArticleImageAnalysis, ImagePipelineInput, ImagePipelineSettings, ImageStrategy } from "./types";

export function decideImageStrategy(
  analysis: ArticleImageAnalysis,
  input: ImagePipelineInput,
  settings: ImagePipelineSettings
): ArticleImageAnalysis {
  const hasSourceImage = Boolean(input.originalImage && input.originalImage !== "/logo.png");
  const sourcePermitted =
    settings.allowSourceImages &&
    input.sourceAllowsImageReuse !== false &&
    (input.sourceTrustLevel === "high" || input.sourceTrustLevel === "medium");

  let strategy: ImageStrategy = "category_fallback";
  let reason = "Using category fallback as safe default.";

  if (analysis.isRealPersonPrimary) {
    if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "Real-person article: using permitted RSS/source image instead of AI face generation.";
    } else {
      strategy = "neutral_illustration";
      reason =
        "Real-person article: AI face generation disabled. Using neutral contextual illustration or category fallback.";
    }
  } else if (hasSourceImage && sourcePermitted && input.preferHostedFirst) {
    strategy = "licensed_source_image";
    reason = "Permitted source image available and preferred for speed.";
  } else if (
    analysis.subjectType === "technology" ||
    analysis.subjectType === "health" ||
    analysis.subjectType === "generic_topic" ||
    analysis.subjectType === "building" ||
    analysis.subjectType === "location"
  ) {
    if (settings.openAiImageEnabled && settings.generateImagesAutomatically) {
      strategy = "openai_generated";
      reason = "Topic suitable for editorial AI illustration without identifiable person likeness.";
    } else if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "AI disabled; using permitted source image.";
    }
  } else if (analysis.subjectType === "court" || analysis.subjectType === "government") {
    strategy = "neutral_illustration";
    reason = "Institutional topic: neutral building or symbolic editorial visual, no fake officials.";
  } else if (analysis.subjectType === "sports_event") {
    if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "Sports event: prefer licensed source or official match image.";
    } else {
      strategy = "neutral_illustration";
      reason = "Sports topic without licensed image: stadium/equipment visual without fake player faces.";
    }
  } else if (hasSourceImage && sourcePermitted) {
    strategy = "licensed_source_image";
    reason = "Permitted source image available.";
  } else if (settings.openAiImageEnabled && settings.generateImagesAutomatically) {
    strategy = "openai_generated";
    reason = "No permitted source image; generating editorial visual.";
  }

  if (
    settings.realPersonAiImageDisabled &&
    analysis.isRealPersonPrimary &&
    strategy === "openai_generated"
  ) {
    strategy = "neutral_illustration";
    reason = "Real-person safeguard: OpenAI generation blocked.";
  }

  return { ...analysis, imageStrategy: strategy, reason };
}
