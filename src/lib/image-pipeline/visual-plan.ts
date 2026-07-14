import "server-only";

import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

export type NewsVisualPlan = {
  mainSubject: string;
  secondarySubjects: string[];
  locationContext: string;
  visualEvent: string;
  composition: string;
  cameraAngle: string;
  lighting: string;
  mood: string;
  colorPalette: string;
  editorialStyle: string;
  mustInclude: string[];
  mustAvoid: string[];
  overlayTextRecommended: boolean;
  safeForGeneration: boolean;
  reason: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 8);
}

function fallbackPlan(input: ImagePipelineInput, analysis: ArticleImageAnalysis): NewsVisualPlan {
  const headline = input.titleEn || input.titleHi;
  const personLed = analysis.isRealPersonPrimary || analysis.namedPeople.length > 0;
  const person = analysis.namedPeople[0] || analysis.primarySubject;
  return {
    mainSubject: personLed
      ? `Editorial portrait of ${person} as the dominant visual focus (~60% of frame)`
      : analysis.primarySubject || headline,
    secondarySubjects: analysis.visualKeywords.slice(0, 4),
    locationContext: analysis.location || "story location context",
    visualEvent: analysis.factualVisualSummary.slice(0, 180),
    composition: personLed
      ? "person-dominant portrait left/center, supporting org/event cues on the side, uncluttered 16:9"
      : "single clear focal subject, center-weighted, uncluttered 16:9 editorial framing",
    cameraAngle: "eye-level documentary",
    lighting: "bright professional newsroom / daylight editorial lighting",
    mood: "serious, credible, premium newsroom",
    colorPalette: "clean neutrals with controlled navy/red accents",
    editorialStyle: "premium BBC/Reuters/AP style editorial illustration-photo hybrid",
    mustInclude: personLed
      ? [`Recognizable likeness of ${person}`, ...analysis.namedOrganizations.slice(0, 2)]
      : [analysis.primarySubject, analysis.location].filter(Boolean).slice(0, 4),
    mustAvoid: [
      "generic scales of justice as main subject",
      "gavel close-up as main subject",
      "category-only legal clipart",
      "unreadable text",
      "fake numbers",
      "watermarks",
      "collage",
      "extra fingers",
      "distorted faces",
      "invented quotes",
    ],
    overlayTextRecommended: false,
    safeForGeneration: true,
    reason: personLed ? "person-led heuristic plan" : "heuristic plan",
  };
}

function parsePlanJson(raw: string): Partial<NewsVisualPlan> | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(raw.slice(start, end + 1)) as Partial<NewsVisualPlan>;
  } catch {
    return null;
  }
}

/**
 * Convert article context into a structured visual plan using gpt-4o-mini.
 * Falls back to heuristics when the key is missing or parsing fails.
 */
export async function planNewsImageVisual(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis
): Promise<NewsVisualPlan> {
  const base = fallbackPlan(input, analysis);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 420);

  const system = `You are a senior news-image art director for an Indian digital newsroom.
Return ONLY valid JSON for a featured image plan.
Rules:
- Stay factual to the provided article context.
- Prefer one clear visual subject.
- If a named public figure exists, they MUST be mainSubject and occupy ~60% of the frame.
- NEVER use scales of justice, gavel, or generic court clipart as the main subject when a person is named.
- Never invent market numbers, scores, quotes, or case details.
- Prefer Indian or story-accurate location context when relevant.`;

  const user = `Create a visual plan JSON with keys:
mainSubject, secondarySubjects, locationContext, visualEvent, composition, cameraAngle, lighting, mood, colorPalette, editorialStyle, mustInclude, mustAvoid, overlayTextRecommended, safeForGeneration, reason.

Headline: ${headline}
Summary: ${summary || "(none)"}
Category: ${input.categoryNameEn} (${input.categoryId})
Primary subject: ${analysis.primarySubject}
Subject type: ${analysis.subjectType}
People: ${analysis.namedPeople.join(", ") || "none"}
Organizations: ${analysis.namedOrganizations.join(", ") || "none"}
Location: ${analysis.location || "none"}
Risk: ${analysis.riskLevel}
Real-person primary: ${analysis.isRealPersonPrimary}
Factual visual summary: ${analysis.factualVisualSummary}

If people are named, mainSubject MUST be that person (editorial portrait), not a legal symbol.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) return base;
    const data = await response.json();
    const content = String(data.choices?.[0]?.message?.content || "");
    const parsed = parsePlanJson(content);
    if (!parsed) return base;

    return {
      mainSubject: String(parsed.mainSubject || base.mainSubject).slice(0, 220),
      secondarySubjects: asStringArray(parsed.secondarySubjects).length
        ? asStringArray(parsed.secondarySubjects)
        : base.secondarySubjects,
      locationContext: String(parsed.locationContext || base.locationContext).slice(0, 180),
      visualEvent: String(parsed.visualEvent || base.visualEvent).slice(0, 260),
      composition: String(parsed.composition || base.composition).slice(0, 220),
      cameraAngle: String(parsed.cameraAngle || base.cameraAngle).slice(0, 120),
      lighting: String(parsed.lighting || base.lighting).slice(0, 160),
      mood: String(parsed.mood || base.mood).slice(0, 120),
      colorPalette: String(parsed.colorPalette || base.colorPalette).slice(0, 160),
      editorialStyle: String(parsed.editorialStyle || base.editorialStyle).slice(0, 180),
      mustInclude: asStringArray(parsed.mustInclude).length
        ? asStringArray(parsed.mustInclude)
        : base.mustInclude,
      mustAvoid: asStringArray(parsed.mustAvoid).length
        ? asStringArray(parsed.mustAvoid)
        : base.mustAvoid,
      overlayTextRecommended: Boolean(parsed.overlayTextRecommended),
      safeForGeneration: parsed.safeForGeneration !== false,
      reason: String(parsed.reason || base.reason).slice(0, 220),
    };
  } catch {
    return base;
  }
}
