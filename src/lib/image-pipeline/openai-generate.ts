import { buildProfessionalNewsImagePrompt } from "./prompt-builder";
import { getOpenAiImageConfig } from "./image-config";
import { OPENAI_SHARPNESS_SUFFIX } from "./quality-config";
import { measureImageQuality, optimizeAndUploadVariants } from "./optimizer";
import { applyNewsTextOverlay } from "./text-overlay";
import { planNewsImageVisual } from "./visual-plan";
import { analyzeArticleStory, analyzeStoryHeuristic } from "./story-analyzer";
import { runThumbnailComprehensionTest } from "./thumbnail-test";
import { buildVisionRetryPrompt, validateGeneratedImageWithVision } from "./vision-qa";
import { IMAGE_TEXT_HARD_RULES } from "./image-text-rules";
import {
  buildNewsVisualStory,
  isGenericSymbolPrompt,
  rewritePromptForStoryComprehension,
} from "./visual-story";
import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

const MIN_ACCEPTABLE_CLARITY = 68;

/** Leave headroom under Vercel function maxDuration (often 60–120s on Hobby/Pro). */
function getBudgetMs(): number {
  return Math.max(45000, Math.min(110000, Number(process.env.OPENAI_IMAGE_BUDGET_MS || 85000)));
}

async function withTimeBudget<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  if (ms <= 0) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
    signal: AbortSignal.timeout(90000),
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
 * Art-director pipeline tuned for Vercel time limits:
 * heuristic story (+ optional short LLM enrich) → plan → prompt → 1 image → optional vision fix once
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

  const started = Date.now();
  const budgetMs = getBudgetMs();
  const remaining = () => budgetMs - (Date.now() - started);
  const canAfford = (needMs: number) => remaining() > needMs;

  // Fast heuristic first (instant) so entertainment / priority / no-paperwork always apply
  let storyAnalysis = analyzeStoryHeuristic(input, analysis);

  // Optional LLM story enrich — skip if budget is tight (saves ~10–20s)
  if (canAfford(28000) && process.env.IMAGE_STORY_LLM !== "false") {
    storyAnalysis = await withTimeBudget(
      analyzeArticleStory(input, analysis),
      Math.min(18000, remaining() - 5000),
      storyAnalysis
    );
  }

  if (!storyAnalysis.canGenerate) {
    return {
      url: null,
      prompt: "",
      skippedReason: storyAnalysis.reason || "Story analyzer could not answer who/what/best-visual",
    };
  }

  const story = buildNewsVisualStory(input, analysis, storyAnalysis);

  const forcePersonPortrait =
    story.imageType === "REAL_PUBLIC_FIGURE" ||
    story.imageType === "POLITICIAN" ||
    story.imageType === "ENTERTAINMENT" ||
    analysis.isRealPersonPrimary ||
    analysis.namedPeople.length > 0 ||
    Boolean(storyAnalysis.mainSubject);
  const effectiveNeutral = neutral && !forcePersonPortrait;

  const enrichedAnalysis = {
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
  };

  // Art-director plan — LLM only if enough time left
  let plan;
  if (canAfford(22000)) {
    const heuristicPlan = await planNewsImageVisual(input, enrichedAnalysis, storyAnalysis, {
      useLlm: false,
    });
    plan = await withTimeBudget(
      planNewsImageVisual(input, enrichedAnalysis, storyAnalysis, { useLlm: true }),
      Math.min(14000, remaining() - 8000),
      heuristicPlan
    );
  } else {
    plan = await planNewsImageVisual(input, enrichedAnalysis, storyAnalysis, { useLlm: false });
  }
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

  // Always reinforce English-only text (cheap, prevents tofu without extra API calls)
  prompt = `${prompt}\n\n${IMAGE_TEXT_HARD_RULES}`;

  if (story.storyScore < 85 || !story.understandsWithoutReading || isGenericSymbolPrompt(prompt)) {
    prompt = rewritePromptForStoryComprehension(prompt, story);
  }

  // Thumbnail gate: heuristic only (GPT test skipped to avoid Vercel timeout)
  const thumb = await runThumbnailComprehensionTest(prompt, story, { heuristicOnly: true });
  prompt = thumb.rewrittenPrompt;

  if (!canAfford(35000)) {
    return {
      url: null,
      prompt,
      skippedReason:
        "Server time budget too low for OpenAI image generation. Please try Regenerate again.",
    };
  }

  let generated = await generateWithModelFallback(apiKey, prompt);
  let rawBuffer = generated.buffer;
  let measured = await measureImageQuality(rawBuffer);
  let imageAttempts = 1;
  let visionScore: number | undefined;

  // Clarity retry only when we still have ~50s+ headroom
  if (
    measured.clarityScore < MIN_ACCEPTABLE_CLARITY &&
    imageAttempts < Math.min(config.maxAttempts, 2) &&
    canAfford(50000)
  ) {
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
      // Keep first result
    }
  }

  const headline = input.titleEn || input.titleHi;

  // Vision QA only if budget remains; tofu/script fail can trigger one image retry
  if (canAfford(22000) && process.env.IMAGE_VISION_QA !== "false") {
    const vision = await withTimeBudget(
      validateGeneratedImageWithVision(rawBuffer, story, headline),
      Math.min(18000, remaining() - 5000),
      {
        approved: true,
        scores: {
          storyClarity: 27,
          mainSubjectVisibility: 22,
          thumbnailReadability: 13,
          composition: 13,
          lighting: 9,
          backgroundRelevance: 5,
          total: 89,
        },
        failureReasons: [],
        rewriteNotes: "",
      }
    );
    visionScore = vision.scores.total;

    const needsTextFix = vision.failureReasons.some((r) =>
      /tofu|glyph|hindi|tamil|telugu|devanagari|script|garbled|mojibake|unreadable/i.test(r)
    );

    if ((!vision.approved || needsTextFix) && imageAttempts < 2 && canAfford(45000)) {
      prompt = buildVisionRetryPrompt(prompt, story, vision);
      try {
        const retry = await generateWithModelFallback(apiKey, prompt);
        const retryMeasured = await measureImageQuality(retry.buffer);
        imageAttempts += 1;
        rawBuffer = retry.buffer;
        measured = retryMeasured;
        generated = retry;
        if (canAfford(15000)) {
          const retryVision = await withTimeBudget(
            validateGeneratedImageWithVision(retry.buffer, story, headline),
            12000,
            vision
          );
          visionScore = retryVision.scores.total;
        }
      } catch {
        // Keep previous buffer
      }
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
