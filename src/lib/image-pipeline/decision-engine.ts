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
  const aiOn = settings.openAiImageEnabled && settings.generateImagesAutomatically;

  let strategy: ImageStrategy = "category_fallback";
  let reason = "Using category fallback as safe default.";

  if (analysis.isRealPersonPrimary) {
    if (hasSourceImage && sourcePermitted && input.preferHostedFirst) {
      strategy = "licensed_source_image";
      reason = "Real-person article: prefer permitted source image when available.";
    } else if (aiOn && !settings.realPersonAiImageDisabled) {
      strategy = "openai_generated";
      reason = "Real-person article: generating high-likeness editorial portrait via OpenAI.";
    } else if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "Real-person article: using permitted RSS/source image.";
    } else if (settings.realPersonAiImageDisabled) {
      strategy = "neutral_illustration";
      reason = "Real-person AI faces disabled — neutral contextual visual or fallback.";
    } else {
      strategy = "category_fallback";
      reason = "Real-person article without usable image path.";
    }
  } else if (hasSourceImage && sourcePermitted && input.preferHostedFirst) {
    strategy = "licensed_source_image";
    reason = "Permitted source image available and preferred for speed.";
  } else if (
    analysis.subjectType === "technology" ||
    analysis.subjectType === "health" ||
    analysis.subjectType === "generic_topic" ||
    analysis.subjectType === "building" ||
    analysis.subjectType === "location" ||
    analysis.subjectType === "product" ||
    analysis.subjectType === "organization" ||
    analysis.subjectType === "event"
  ) {
    if (aiOn) {
      strategy = "openai_generated";
      reason = "Topic suitable for editorial AI featured image.";
    } else if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "AI disabled; using permitted source image.";
    }
  } else if (analysis.subjectType === "court" || analysis.subjectType === "government") {
    if (aiOn) {
      strategy = "openai_generated";
      reason = "Institutional topic: editorial building/symbolic scene (no fabricated verdict).";
    } else {
      strategy = "neutral_illustration";
      reason = "Institutional topic without AI — neutral fallback path.";
    }
  } else if (analysis.subjectType === "sports_event") {
    if (hasSourceImage && sourcePermitted) {
      strategy = "licensed_source_image";
      reason = "Sports event: prefer licensed source or official match image.";
    } else if (aiOn) {
      strategy = "openai_generated";
      reason = "Sports topic: editorial stadium/action scene.";
    } else {
      strategy = "neutral_illustration";
      reason = "Sports topic without licensed image.";
    }
  } else if (hasSourceImage && sourcePermitted) {
    strategy = "licensed_source_image";
    reason = "Permitted source image available.";
  } else if (aiOn) {
    strategy = "openai_generated";
    reason = "No permitted source image; generating editorial visual.";
  }

  if (
    settings.realPersonAiImageDisabled &&
    analysis.isRealPersonPrimary &&
    strategy === "openai_generated"
  ) {
    strategy = "neutral_illustration";
    reason = "Real-person safeguard: OpenAI face generation blocked by settings.";
  }

  return { ...analysis, imageStrategy: strategy, reason };
}
