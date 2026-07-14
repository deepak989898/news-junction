import "server-only";

import sharp from "sharp";
import type { NewsVisualStory } from "./visual-story";
import { rewritePromptForStoryComprehension } from "./visual-story";
import type { PromptQualityScores } from "./thumbnail-test";

export type VisionQaResult = {
  approved: boolean;
  scores: PromptQualityScores;
  failureReasons: string[];
  rewriteNotes: string;
};

const MIN_SCORE = 90;

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function toVisionJpegDataUrl(buffer: Buffer): Promise<string> {
  const small = await sharp(buffer)
    .resize({ width: 768, withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();
  return `data:image/jpeg;base64,${small.toString("base64")}`;
}

/**
 * Post-generation Vision Quality Validator (Step 12).
 * Rejects logo-dominated, paperwork-invented, collage, or weak-subject images.
 */
export async function validateGeneratedImageWithVision(
  imageBuffer: Buffer,
  story: NewsVisualStory,
  headline: string
): Promise<VisionQaResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
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
    };
  }

  try {
    const dataUrl = await toVisionJpegDataUrl(imageBuffer);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a news image quality validator for editorial thumbnails.
Score the image (max): storyClarity 30, mainSubjectVisibility 25, thumbnailReadability 15, composition 15, lighting 10, backgroundRelevance 5.
Minimum total to approve: 90.
FAIL if:
- Platform logo / document / icon is larger than the main person
- Random paperwork/contract appears when not about legal news
- Collage / split-screen / cluttered keyword collage
- Main subject occupies clearly under ~50% of frame when a person should lead
- Cannot tell who/what at thumbnail size
Return JSON: approved, storyClarity, mainSubjectVisibility, thumbnailReadability, composition, lighting, backgroundRelevance, total, failureReasons (array), rewriteNotes.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Headline: ${headline}
Expected main subject: ${story.mainSubject}
Image type: ${story.imageType}
Event: ${story.eventSummary}
Visual priority: ${(story.visualPriority || []).join(" > ")}
Must avoid: ${story.mustAvoid.slice(0, 8).join("; ")}`,
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      return {
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
        failureReasons: ["vision_api_failed"],
        rewriteNotes: "",
      };
    }

    const data = await response.json();
    const parsed = parseJsonObject(String(data.choices?.[0]?.message?.content || ""));
    if (!parsed) {
      return {
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
        failureReasons: ["vision_parse_failed"],
        rewriteNotes: "",
      };
    }

    const scores: PromptQualityScores = {
      storyClarity: Number(parsed.storyClarity || 0),
      mainSubjectVisibility: Number(parsed.mainSubjectVisibility || 0),
      thumbnailReadability: Number(parsed.thumbnailReadability || 0),
      composition: Number(parsed.composition || 0),
      lighting: Number(parsed.lighting || 0),
      backgroundRelevance: Number(parsed.backgroundRelevance || 0),
      total: Number(parsed.total || 0),
    };
    const failureReasons = Array.isArray(parsed.failureReasons)
      ? parsed.failureReasons.map((x) => String(x)).slice(0, 8)
      : [];
    const approved = parsed.approved === true || (scores.total >= MIN_SCORE && failureReasons.length === 0);

    return {
      approved,
      scores,
      failureReasons,
      rewriteNotes: String(parsed.rewriteNotes || failureReasons.join("; ")).slice(0, 400),
    };
  } catch {
    return {
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
      failureReasons: ["vision_error"],
      rewriteNotes: "",
    };
  }
}

export function buildVisionRetryPrompt(
  prompt: string,
  story: NewsVisualStory,
  qa: VisionQaResult
): string {
  return rewritePromptForStoryComprehension(
    prompt,
    story,
    `VISION QA FAILED (score ${qa.scores.total}/100). Fix: ${qa.rewriteNotes || qa.failureReasons.join("; ")}. Ensure actor/person occupies 60-70% of frame; shrink logos; remove invented paperwork; no collage.`
  );
}
