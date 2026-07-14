import "server-only";

import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { StoryAnalysisResult } from "./story-analyzer";
import { getEntertainmentLayout, fillEntertainmentTemplate } from "./entertainment-styles";

export type NewsVisualPlan = {
  mainSubject: string;
  secondarySubjects: string[];
  secondarySubject: string;
  locationContext: string;
  visualEvent: string;
  visualStory: string;
  objects: string[];
  background: string;
  composition: string;
  cameraAngle: string;
  lighting: string;
  mood: string;
  colorPalette: string;
  editorialStyle: string;
  mustInclude: string[];
  mustAvoid: string[];
  avoid: string[];
  visualPriority: string[];
  frameBalance: string;
  imageType: string;
  overlayTextRecommended: boolean;
  safeForGeneration: boolean;
  reason: string;
  entertainmentTemplate?: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 8);
}

function fallbackPlan(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storyAnalysis?: StoryAnalysisResult | null
): NewsVisualPlan {
  const headline = input.titleEn || input.titleHi;
  const personLed = analysis.isRealPersonPrimary || analysis.namedPeople.length > 0 || Boolean(storyAnalysis?.mainSubject);
  const person = storyAnalysis?.mainSubject || analysis.namedPeople[0] || analysis.primarySubject;
  const layout = getEntertainmentLayout(storyAnalysis?.entertainmentStyle);
  const isEnt = Boolean(layout);
  const frameBalance =
    layout?.frameBalance ||
    "Main person ~60% of frame; supporting elements ~25%; background ~15%. Logos/documents/icons must never exceed main subject size.";

  const avoid = [
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
    ...(isEnt
      ? [
          "random paperwork / contracts",
          "platform logo larger than actor",
          "fake awards",
          "invented audience",
        ]
      : ["invented paperwork unless article is legal"]),
    ...(layout?.mustAvoidHints || []),
  ];

  return {
    mainSubject: personLed
      ? `Editorial portrait of ${person} as the dominant visual focus (~60-70% of frame)`
      : analysis.primarySubject || headline,
    secondarySubjects: storyAnalysis?.secondarySubjects?.length
      ? storyAnalysis.secondarySubjects.slice(0, 4)
      : analysis.visualKeywords.slice(0, 4),
    secondarySubject:
      storyAnalysis?.movieTitle ||
      storyAnalysis?.secondarySubjects?.[0] ||
      analysis.namedOrganizations[0] ||
      analysis.visualKeywords[0] ||
      "",
    locationContext: analysis.location || "story location context",
    visualEvent:
      storyAnalysis?.understanding.whatHappened || analysis.factualVisualSummary.slice(0, 180),
    visualStory:
      storyAnalysis?.understanding.bestVisual ||
      analysis.factualVisualSummary.slice(0, 200) ||
      headline,
    objects: isEnt
      ? [storyAnalysis?.movieTitle, storyAnalysis?.platform].filter(Boolean).map(String)
      : [],
    background: isEnt
      ? "soft cinematic bokeh / premium entertainment atmosphere"
      : "uncluttered editorial background supporting the story",
    composition: layout?.composition ||
      (personLed
        ? "person-dominant portrait left/center, supporting org/event cues on the side, uncluttered 16:9"
        : "single clear focal subject, center-weighted, uncluttered 16:9 editorial framing"),
    cameraAngle: "eye-level editorial / slight three-quarter portrait",
    lighting: layout?.lighting || "bright professional newsroom / daylight editorial lighting",
    mood: layout?.mood || "serious, credible, premium newsroom",
    colorPalette: layout?.colorPalette || "clean neutrals with controlled navy/red accents",
    editorialStyle:
      layout?.editorialStyle || "premium BBC/Reuters/AP style editorial illustration-photo hybrid",
    mustInclude: personLed
      ? [
          `Recognizable likeness of ${person}`,
          ...(storyAnalysis?.movieTitle ? [`Title branding: ${storyAnalysis.movieTitle}`] : []),
          ...(storyAnalysis?.platform
            ? [`${storyAnalysis.platform} logo smaller than person`]
            : analysis.namedOrganizations.slice(0, 2)),
          ...(layout?.mustIncludeHints || []),
        ]
      : [analysis.primarySubject, analysis.location].filter(Boolean).slice(0, 4),
    mustAvoid: avoid,
    avoid,
    visualPriority: storyAnalysis?.visualPriority || [person, ...analysis.namedOrganizations].filter(Boolean),
    frameBalance,
    imageType: isEnt ? "ENTERTAINMENT" : personLed ? "REAL_PUBLIC_FIGURE" : "EVENT",
    overlayTextRecommended: false,
    safeForGeneration: storyAnalysis ? storyAnalysis.canGenerate !== false : true,
    reason: isEnt
      ? `entertainment ${storyAnalysis?.entertainmentStyle} heuristic plan`
      : personLed
        ? "person-led heuristic plan"
        : "heuristic plan",
    entertainmentTemplate: layout
      ? fillEntertainmentTemplate(layout.style, {
          actor: person,
          movie: storyAnalysis?.movieTitle || "",
          platform: storyAnalysis?.platform || "",
        })
      : undefined,
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
  analysis: ArticleImageAnalysis,
  storyAnalysis?: StoryAnalysisResult | null
): Promise<NewsVisualPlan> {
  const base = fallbackPlan(input, analysis, storyAnalysis);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 420);
  const layout = getEntertainmentLayout(storyAnalysis?.entertainmentStyle);

  const system = `You are a senior news-image art director for an Indian digital newsroom.
Return ONLY valid JSON for a featured image plan.
Rules:
- Stay factual to the provided article context.
- Prefer one clear visual subject.
- If a named public figure / actor exists, they MUST be mainSubject and occupy ~60-70% of the frame.
- Frame balance: main person ~60%, supporting ~25%, background ~15%.
- Logos, documents, and icons must NEVER be larger than the main subject.
- NEVER use scales of justice, gavel, paperwork, or generic court clipart as the main subject when a person is named — unless the article is explicitly legal news.
- For entertainment / OTT / movie stories: premium poster layout, warm cinematic lighting, platform logo smaller than actor, no invented objects.
- Never invent market numbers, scores, quotes, or case details.
- Prefer Indian or story-accurate location context when relevant.
- In-image text: English/Latin only. Never Hindi/Tamil/Telugu/Devanagari. Never tofu boxes.`;

  const user = `Create a visual plan JSON with keys:
mainSubject, secondarySubject, secondarySubjects, locationContext, visualEvent, visualStory, objects, background, composition, cameraAngle, lighting, mood, colorPalette, editorialStyle, mustInclude, mustAvoid, avoid, visualPriority, frameBalance, imageType, overlayTextRecommended, safeForGeneration, reason.

Headline: ${headline}
Summary: ${summary || "(none)"}
Category: ${input.categoryNameEn} (${input.categoryId})
Story understanding: ${JSON.stringify(storyAnalysis?.understanding || {})}
Visual priority: ${(storyAnalysis?.visualPriority || []).join(" > ") || "n/a"}
Entertainment style: ${storyAnalysis?.entertainmentStyle || "none"}
Platform: ${storyAnalysis?.platform || "none"}
Movie title: ${storyAnalysis?.movieTitle || "none"}
Primary subject: ${analysis.primarySubject}
People: ${analysis.namedPeople.join(", ") || "none"}
Organizations: ${analysis.namedOrganizations.join(", ") || "none"}
Location: ${analysis.location || "none"}
Layout hint: ${layout?.composition || "standard editorial"}

If people are named, mainSubject MUST be that person (editorial portrait), not a logo or document.`;

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

    const avoid = asStringArray(parsed.avoid).length
      ? asStringArray(parsed.avoid)
      : asStringArray(parsed.mustAvoid).length
        ? asStringArray(parsed.mustAvoid)
        : base.avoid;

    return {
      mainSubject: String(parsed.mainSubject || base.mainSubject).slice(0, 220),
      secondarySubjects: asStringArray(parsed.secondarySubjects).length
        ? asStringArray(parsed.secondarySubjects)
        : base.secondarySubjects,
      secondarySubject: String(parsed.secondarySubject || base.secondarySubject).slice(0, 160),
      locationContext: String(parsed.locationContext || base.locationContext).slice(0, 180),
      visualEvent: String(parsed.visualEvent || base.visualEvent).slice(0, 260),
      visualStory: String(parsed.visualStory || base.visualStory).slice(0, 300),
      objects: asStringArray(parsed.objects).length ? asStringArray(parsed.objects) : base.objects,
      background: String(parsed.background || base.background).slice(0, 180),
      composition: String(parsed.composition || base.composition).slice(0, 280),
      cameraAngle: String(parsed.cameraAngle || base.cameraAngle).slice(0, 120),
      lighting: String(parsed.lighting || base.lighting).slice(0, 160),
      mood: String(parsed.mood || base.mood).slice(0, 120),
      colorPalette: String(parsed.colorPalette || base.colorPalette).slice(0, 160),
      editorialStyle: String(parsed.editorialStyle || base.editorialStyle).slice(0, 180),
      mustInclude: asStringArray(parsed.mustInclude).length
        ? asStringArray(parsed.mustInclude)
        : base.mustInclude,
      mustAvoid: avoid,
      avoid,
      visualPriority: asStringArray(parsed.visualPriority).length
        ? asStringArray(parsed.visualPriority)
        : base.visualPriority,
      frameBalance: String(parsed.frameBalance || base.frameBalance).slice(0, 220),
      imageType: String(parsed.imageType || base.imageType).slice(0, 40),
      overlayTextRecommended: Boolean(parsed.overlayTextRecommended),
      safeForGeneration: parsed.safeForGeneration !== false && base.safeForGeneration,
      reason: String(parsed.reason || base.reason).slice(0, 220),
      entertainmentTemplate: base.entertainmentTemplate,
    };
  } catch {
    return base;
  }
}
