import { buildNeutralIllustrationPrompt, buildOpenAiImagePrompt } from "./prompt-builder";
import { OPENAI_SHARPNESS_SUFFIX } from "./quality-config";
import { measureImageQuality, optimizeAndUploadVariants } from "./optimizer";
import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

const MIN_ACCEPTABLE_CLARITY = 68;

async function callOpenAiImageApi(apiKey: string, prompt: string): Promise<Buffer> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "high",
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${err.slice(0, 180)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) {
    throw new Error("OpenAI returned no image data.");
  }

  return Buffer.from(b64, "base64");
}

export async function generateOpenAiImage(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storageId: string,
  neutral: boolean
): Promise<{ url: string | null; prompt: string; fileHash?: string; clarityScore?: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { url: null, prompt: "" };

  const basePrompt = neutral
    ? buildNeutralIllustrationPrompt(input, analysis)
    : buildOpenAiImagePrompt(input, analysis);

  let prompt = basePrompt;
  let rawBuffer = await callOpenAiImageApi(apiKey, prompt);
  let measured = await measureImageQuality(rawBuffer);

  if (measured.clarityScore < MIN_ACCEPTABLE_CLARITY) {
    prompt = `${basePrompt}\n\n${OPENAI_SHARPNESS_SUFFIX}`;
    try {
      const retryBuffer = await callOpenAiImageApi(apiKey, prompt);
      const retryMeasured = await measureImageQuality(retryBuffer);
      if (retryMeasured.clarityScore >= measured.clarityScore) {
        rawBuffer = retryBuffer;
        measured = retryMeasured;
      }
    } catch {
      // Keep first result if retry fails
    }
  }

  const uploaded = await optimizeAndUploadVariants(storageId, rawBuffer);
  return {
    url: uploaded.variants.large,
    prompt,
    fileHash: uploaded.fileHash,
    clarityScore: Math.max(uploaded.clarityScore, measured.clarityScore),
  };
}
