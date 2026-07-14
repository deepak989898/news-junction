import { buildProfessionalNewsImagePrompt } from "./prompt-builder";
import { getOpenAiImageConfig } from "./image-config";
import { OPENAI_SHARPNESS_SUFFIX } from "./quality-config";
import { measureImageQuality, optimizeAndUploadVariants } from "./optimizer";
import { applyNewsTextOverlay } from "./text-overlay";
import { planNewsImageVisual } from "./visual-plan";
import {
  buildNewsVisualStory,
  isGenericSymbolPrompt,
  rewritePromptForStoryComprehension,
} from "./visual-story";
import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

const MIN_ACCEPTABLE_CLARITY = 68;

async function callOpenAiImageApi(
  apiKey: string,
  prompt: string,
  model: string,
  quality: "low" | "medium" | "high",
  size: string
): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI image generation failed (${model}): ${response.status} ${err.slice(0, 220)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) {
    throw new Error("OpenAI returned no image data.");
  }

  return Buffer.from(b64, "base64");
}

async function generateWithModelFallback(
  apiKey: string,
  prompt: string
): Promise<{ buffer: Buffer; model: string; quality: string; size: string }> {
  const config = getOpenAiImageConfig();
  const models = Array.from(new Set([config.model, config.fallbackModel].filter(Boolean)));
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const buffer = await callOpenAiImageApi(apiKey, prompt, model, config.quality, config.size);
      return { buffer, model, quality: config.quality, size: config.size };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("OpenAI image generation failed");
}

export async function generateOpenAiImage(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storageId: string,
  neutral: boolean
): Promise<{
  url: string | null;
  prompt: string;
  fileHash?: string;
  clarityScore?: number;
  modelUsed?: string;
  qualityUsed?: string;
  storyScore?: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const config = getOpenAiImageConfig();
  if (!apiKey || !config.enabled) return { url: null, prompt: "" };

  const story = buildNewsVisualStory(input, analysis);
  // Never force neutral clipart when a named public figure is the story.
  const forcePersonPortrait =
    story.imageType === "REAL_PUBLIC_FIGURE" ||
    story.imageType === "POLITICIAN" ||
    analysis.isRealPersonPrimary ||
    analysis.namedPeople.length > 0;
  const effectiveNeutral = neutral && !forcePersonPortrait;

  const plan = await planNewsImageVisual(input, {
    ...analysis,
    isRealPersonPrimary: forcePersonPortrait || analysis.isRealPersonPrimary,
    primarySubject: forcePersonPortrait ? story.mainSubject : analysis.primarySubject,
  });
  if (!plan.safeForGeneration) {
    return { url: null, prompt: plan.reason || "Visual plan marked unsafe" };
  }

  let prompt = buildProfessionalNewsImagePrompt({
    input,
    analysis,
    plan,
    neutral: effectiveNeutral,
    story,
  });

  if (story.storyScore < 85 || !story.understandsWithoutReading || isGenericSymbolPrompt(prompt)) {
    prompt = rewritePromptForStoryComprehension(prompt, story);
  }

  let generated = await generateWithModelFallback(apiKey, prompt);
  let rawBuffer = generated.buffer;
  let measured = await measureImageQuality(rawBuffer);
  let attempts = 1;

  if (measured.clarityScore < MIN_ACCEPTABLE_CLARITY && attempts < config.maxAttempts) {
    prompt = `${prompt}\n\n${OPENAI_SHARPNESS_SUFFIX}\nEmphasize bright lighting and a clear facial/portrait focus when a person is the main subject.`;
    try {
      const retry = await generateWithModelFallback(apiKey, prompt);
      const retryMeasured = await measureImageQuality(retry.buffer);
      attempts += 1;
      if (retryMeasured.clarityScore >= measured.clarityScore) {
        rawBuffer = retry.buffer;
        measured = retryMeasured;
        generated = retry;
      }
    } catch {
      // Keep first result if retry fails
    }
  }

  if (config.textOverlayEnabled || plan.overlayTextRecommended) {
    try {
      const headlineEn = (input.titleEn || "").trim();
      const headlineHi = (input.titleHi || "").trim();
      const live = /\blive\b|लाइव/i.test(`${headlineEn} ${headlineHi}`);
      rawBuffer = await applyNewsTextOverlay(rawBuffer, {
        headline: headlineEn || headlineHi,
        headlineEn: headlineEn || undefined,
        categoryLabel: input.categoryNameEn || input.categoryId,
        live,
      });
    } catch {
      // Non-fatal
    }
  }

  const uploaded = await optimizeAndUploadVariants(storageId, rawBuffer);
  return {
    url: uploaded.variants.large,
    prompt,
    fileHash: uploaded.fileHash,
    clarityScore: Math.max(uploaded.clarityScore, measured.clarityScore),
    modelUsed: generated.model,
    qualityUsed: generated.quality,
    storyScore: story.storyScore,
  };
}
