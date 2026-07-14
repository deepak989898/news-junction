import { buildProfessionalNewsImagePrompt } from "./prompt-builder";
import { getOpenAiImageConfig } from "./image-config";
import { OPENAI_SHARPNESS_SUFFIX } from "./quality-config";
import { measureImageQuality, optimizeAndUploadVariants } from "./optimizer";
import { applyNewsTextOverlay } from "./text-overlay";
import { planNewsImageVisual } from "./visual-plan";
import { analyzeArticleStory } from "./story-analyzer";
import { runThumbnailComprehensionTest } from "./thumbnail-test";
import { buildVisionRetryPrompt, validateGeneratedImageWithVision } from "./vision-qa";
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

export type GenerateOpenAiImageResult = {
  url: string | null;
  prompt: string;
  fileHash?: string;
  clarityScore?: number;
  modelUsed?: string;
  qualityUsed?: string;
  storyScore?: number;
  visionScore?: number;
  skippedReason?: string;
};

/**
 * Full art-director pipeline:
 * Article → Story Analyzer → Visual Priority → Layout → Plan → Thumbnail Test
 * → OpenAI Image → Clarity → Vision QA (1 retry) → Upload
 */
export async function generateOpenAiImage(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storageId: string,
  neutral: boolean
): Promise<GenerateOpenAiImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const config = getOpenAiImageConfig();
  if (!apiKey || !config.enabled) return { url: null, prompt: "" };

  // Step 1–2: Story Understanding + Visual Priority
  const storyAnalysis = await analyzeArticleStory(input, analysis);
  if (!storyAnalysis.canGenerate) {
    return {
      url: null,
      prompt: "",
      skippedReason: storyAnalysis.reason || "Story analyzer could not answer who/what/best-visual",
    };
  }

  // Steps 3–4 & 11: Visual story + entertainment layout cues
  const story = buildNewsVisualStory(input, analysis, storyAnalysis);

  const forcePersonPortrait =
    story.imageType === "REAL_PUBLIC_FIGURE" ||
    story.imageType === "POLITICIAN" ||
    story.imageType === "ENTERTAINMENT" ||
    analysis.isRealPersonPrimary ||
    analysis.namedPeople.length > 0 ||
    Boolean(storyAnalysis.mainSubject);
  const effectiveNeutral = neutral && !forcePersonPortrait;

  // Step 8: Art-director JSON plan
  const plan = await planNewsImageVisual(
    input,
    {
      ...analysis,
      isRealPersonPrimary: forcePersonPortrait || analysis.isRealPersonPrimary,
      primarySubject: forcePersonPortrait ? story.mainSubject : analysis.primarySubject,
      namedPeople:
        analysis.namedPeople.length > 0
          ? analysis.namedPeople
          : storyAnalysis.mainSubject
            ? [storyAnalysis.mainSubject]
            : analysis.namedPeople,
      namedOrganizations: uniqOrgs([
        ...(storyAnalysis.platform ? [storyAnalysis.platform] : []),
        ...analysis.namedOrganizations,
      ]),
    },
    storyAnalysis
  );
  if (!plan.safeForGeneration) {
    return { url: null, prompt: plan.reason || "Visual plan marked unsafe", skippedReason: plan.reason };
  }

  let prompt = buildProfessionalNewsImagePrompt({
    input,
    analysis,
    plan,
    neutral: effectiveNeutral,
    story,
    storyAnalysis,
  });

  if (story.storyScore < 85 || !story.understandsWithoutReading || isGenericSymbolPrompt(prompt)) {
    prompt = rewritePromptForStoryComprehension(prompt, story);
  }

  // Step 9–10–12 (prompt side): Thumbnail test + score gate
  const thumb = await runThumbnailComprehensionTest(prompt, story);
  prompt = thumb.rewrittenPrompt;

  let generated = await generateWithModelFallback(apiKey, prompt);
  let rawBuffer = generated.buffer;
  let measured = await measureImageQuality(rawBuffer);
  let imageAttempts = 1;
  let visionScore: number | undefined;

  if (measured.clarityScore < MIN_ACCEPTABLE_CLARITY && imageAttempts < config.maxAttempts) {
    prompt = `${prompt}\n\n${OPENAI_SHARPNESS_SUFFIX}\nEmphasize bright lighting and a clear facial/portrait focus when a person is the main subject.`;
    try {
      const retry = await generateWithModelFallback(apiKey, prompt);
      const retryMeasured = await measureImageQuality(retry.buffer);
      imageAttempts += 1;
      if (retryMeasured.clarityScore >= measured.clarityScore) {
        rawBuffer = retry.buffer;
        measured = retryMeasured;
        generated = retry;
      }
    } catch {
      // Keep first result if retry fails
    }
  }

  // Step 12: Vision QA — regenerate once if below bar
  const headline = input.titleEn || input.titleHi;
  let vision = await validateGeneratedImageWithVision(rawBuffer, story, headline);
  visionScore = vision.scores.total;
  if (!vision.approved && imageAttempts < 2) {
    prompt = buildVisionRetryPrompt(prompt, story, vision);
    try {
      const retry = await generateWithModelFallback(apiKey, prompt);
      const retryMeasured = await measureImageQuality(retry.buffer);
      imageAttempts += 1;
      const retryVision = await validateGeneratedImageWithVision(retry.buffer, story, headline);
      if (retryVision.scores.total >= vision.scores.total || retryVision.approved) {
        rawBuffer = retry.buffer;
        measured = retryMeasured;
        generated = retry;
        vision = retryVision;
        visionScore = retryVision.scores.total;
      }
    } catch {
      // Keep previous buffer
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
    visionScore,
  };
}

function uniqOrgs(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
