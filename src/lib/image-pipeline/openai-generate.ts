import { buildNeutralIllustrationPrompt, buildOpenAiImagePrompt } from "./prompt-builder";
import { hashImageBuffer } from "./source-fetcher";
import { optimizeAndUploadVariants } from "./optimizer";
import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

export async function generateOpenAiImage(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storageId: string,
  neutral: boolean
): Promise<{ url: string | null; prompt: string; fileHash?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { url: null, prompt: "" };

  const prompt = neutral
    ? buildNeutralIllustrationPrompt(input, analysis)
    : buildOpenAiImagePrompt(input, analysis);

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
    signal: AbortSignal.timeout(90000),
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

  const rawBuffer = Buffer.from(b64, "base64");
  const uploaded = await optimizeAndUploadVariants(storageId, rawBuffer);
  return { url: uploaded.variants.large, prompt, fileHash: uploaded.fileHash };
}
