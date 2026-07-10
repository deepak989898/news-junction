import { getAdminStorage } from "@/lib/firebase-admin";

const CATEGORY_VISUAL_STYLE: Record<string, string> = {
  khel: "dynamic sports action photography",
  technology: "modern technology and innovation scene",
  vyapar: "business and finance editorial photography",
  swasthya: "health and wellness editorial scene",
  manoranjan: "entertainment and culture editorial photography",
  duniya: "international news scene",
  rajya: "Indian state news scene",
  desh: "Indian national news editorial photography",
  video: "broadcast and media production scene",
};

function isSafeImageUrl(url: string): boolean {
  if (!url || url === "/logo.png") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildImagePrompt(params: {
  titleEn: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
}): string {
  const style = CATEGORY_VISUAL_STYLE[params.categoryId] || "editorial news photography";
  const summary = params.summaryEn.replace(/\s+/g, " ").slice(0, 220);
  return `Create a professional featured news image for a Hindi-English news website.
Headline: ${params.titleEn}
Context: ${summary}
Category: ${params.categoryNameEn}
Visual style: ${style}, photorealistic, high quality, natural lighting.
Rules: no text, no logos, no watermarks, no faces of real identifiable people, no violence, factual tone.`;
}

async function uploadAutomationImage(rawNewsId: string, buffer: Buffer): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const path = `news/automation/${rawNewsId}/${Date.now()}.png`;
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType: "image/png",
    resumable: false,
    metadata: { cacheControl: "public,max-age=31536000" },
  });
  try {
    await file.makePublic();
  } catch {
    // Bucket may already allow public reads via rules.
  }
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

export async function generateAutomationArticleImage(params: {
  rawNewsId: string;
  titleEn: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = buildImagePrompt(params);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${err.slice(0, 180)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) return null;

  return uploadAutomationImage(params.rawNewsId, Buffer.from(b64, "base64"));
}

export async function resolveAutomationArticleImage(params: {
  rawNewsId: string;
  originalImage: string;
  generatedImageUrl?: string;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  categoryId: string;
  categoryNameEn: string;
  fallbackImage: string;
  generateAiImages: boolean;
}): Promise<{ imageUrl: string; generated: boolean }> {
  if (isSafeImageUrl(params.generatedImageUrl || "")) {
    return { imageUrl: params.generatedImageUrl!, generated: true };
  }

  if (isSafeImageUrl(params.originalImage)) {
    return { imageUrl: params.originalImage, generated: false };
  }

  if (!params.generateAiImages) {
    return { imageUrl: params.fallbackImage, generated: false };
  }

  try {
    const generated = await generateAutomationArticleImage({
      rawNewsId: params.rawNewsId,
      titleEn: params.titleEn || params.titleHi,
      summaryEn: params.summaryEn,
      categoryId: params.categoryId,
      categoryNameEn: params.categoryNameEn,
    });
    if (generated) {
      return { imageUrl: generated, generated: true };
    }
  } catch {
    // Fall back to default image if generation fails.
  }

  return { imageUrl: params.fallbackImage, generated: false };
}
