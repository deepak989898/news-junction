import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { NewsVisualPlan } from "./visual-plan";

export const QUALITY_DIRECTIVES = `Technical quality requirements:
- Bright, well-lit editorial photography — NOT dark, NOT underexposed, NOT moody night-cinema look
- Clear daylight or soft professional studio/newsroom lighting with visible detail in shadows
- Ultra-sharp focus on the main subject, crisp edges, no motion blur, no soft focus
- Professional Reuters/AP/BBC/NDTV editorial quality with proper exposure and rich natural colors
- High clarity and contrast — NOT faded, NOT washed out, NOT hazy, NOT low-resolution looking
- Single unified photograph/scene only — absolutely NO split-screen, NO diptych, NO side-by-side panels, NO before/after layout, NO collage, NO multiple frames
- ONE coherent scene filling the entire landscape frame edge to edge
- Strong subject-background separation, immediately readable at thumbnail size
- Absolutely NO Hindi/Devanagari letters, NO tofu/box characters, NO unreadable glyphs inside the image
- Prefer little or no in-image text; if English labels appear they must be short, sharp, and spelled correctly`;

const CATEGORY_RULES: Record<string, string> = {
  vyapar: `BUSINESS / MARKETS visual rules:
- Indian financial-market atmosphere: trading floor glow, Bombay Stock Exchange / Dalal Street / financial-district skyline when relevant
- Restrained bullish or bearish chart silhouette WITHOUT any readable index values, prices, or percentages
- Optional rupee symbol as a subtle motif only when relevant
- Professional trading screens as atmosphere only — never invent Sensex/Nifty numbers
- Business leaders only when central; otherwise keep symbolic market visuals`,
  khel: `SPORTS visual rules:
- Relevant sport equipment, stadium atmosphere, match action silhouettes
- Team-color mood without inventing jersey numbers, scores, trophies, or players not in the article`,
  technology: `TECHNOLOGY visual rules:
- Credible devices, data-centre glow, clean UI silhouettes, cybersecurity / AI concepts
- Do not fabricate fake product screenshots that look like real apps or OS UIs`,
  swasthya: `HEALTH visual rules:
- Clinic / hospital / lab atmosphere, medical equipment, public-health context
- Responsible, calm editorial tone — no graphic medical imagery`,
  manoranjan: `ENTERTAINMENT visual rules:
- Cinema, stage, premiere lighting, film-set atmosphere
- Avoid false celebrity likenesses or invented award scenes`,
  duniya: `WORLD visual rules:
- Region-accurate landmarks or diplomatic/civic atmosphere matching the story location`,
  rajya: `STATE / LOCAL visual rules:
- Regional civic infrastructure, administration, roads, public facilities, or accurate local atmosphere`,
  desh: `NATIONAL visual rules:
- Indian civic context, parliament exterior, major city skyline, policy/event atmosphere — neutral and credible`,
  video: `MEDIA visual rules:
- Broadcast studio, camera lighting, newsroom production atmosphere`,
  court: `COURT / LEGAL visual rules:
- Court building exterior, scales of justice, legal documents, gavel as symbolic support
- Do not invent a judicial decision or courtroom verdict scene`,
  rajniti: `POLITICS visual rules:
- Parliament/assembly exterior, podium, voting context, institutional architecture
- Neutral balanced tone — do not portray any politician as criminal, defeated, or triumphant unless article context clearly supports it`,
  mausam: `WEATHER / DISASTER visual rules:
- Location-appropriate weather, clouds, rain, flood, heat, cyclone atmosphere
- Do not exaggerate severity beyond the article`,
  shiksha: `EDUCATION visual rules:
- Campus, classroom, books, university architecture — optimistic and clear`,
  vigyan: `SCIENCE visual rules:
- Laboratory, research equipment, space/tech exploration atmosphere without fake data overlays`,
};

function categoryRules(categoryId: string): string {
  return CATEGORY_RULES[categoryId] || `Category visual rules: premium editorial scene matching ${categoryId} news.`;
}

function accuracyBlock(): string {
  return `Accuracy requirements:
- Represent only facts supported by the article context
- Do NOT invent numbers, dates, quotes, statistics, Sensex/Nifty values, stock prices, or match scores
- Do NOT fabricate a specific press-event photograph
- Do NOT imply the image is an authentic wire photo from the event
- Do NOT add unrelated people, buildings, flags, or logos
- Do NOT create misleading facial expressions or actions
- Do NOT portray allegations as proven facts

Avoid:
- Unreadable text, misspelled words, fake quotes, fake LIVE/BREAKING stamps
- Fake stock-market values or random charts with digits
- Duplicate objects, extra fingers, distorted faces, deformed buildings
- Watermarks, website logos, collage overload, clickbait unrelated composition
- Pasting the full article headline as image text`;
}

export function buildProfessionalNewsImagePrompt(args: {
  input: ImagePipelineInput;
  analysis: ArticleImageAnalysis;
  plan: NewsVisualPlan;
  neutral: boolean;
}): string {
  const { input, analysis, plan, neutral } = args;
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || analysis.factualVisualSummary)
    .replace(/\s+/g, " ")
    .slice(0, 360);
  const mainSubject = neutral
    ? "neutral symbolic scene related to the topic — NOT any real person's face or likeness"
    : plan.mainSubject || analysis.primarySubject;

  const personBlock =
    !neutral && analysis.isRealPersonPrimary
      ? `Real-person editorial rules:
- Generate a photorealistic, believable Indian/global news portrait or event image of the primary person when they are the story focus
- Face must be fully visible in frame (no cut-off forehead/chin), natural proportions, anatomically correct
- Aim for high likeness / recognition quality for a public-figure news thumbnail (serious editorial, not cartoon)
- Neutral journalistic expression; do not invent criminal, humiliating, or fabricated event poses
- Keep lighting bright and clear for face detail
- Prefer chest-up or three-quarter framing for portraits`
      : "";

  return `Create a premium editorial featured image for a trusted Indian digital news website (News Junction).

Article headline:
${headline}

Article summary:
${summary}

News category:
${input.categoryNameEn} (${input.categoryId})

Location:
${plan.locationContext || analysis.location || "India"}

Main visual subject:
${mainSubject}

Supporting visual elements:
${(plan.secondarySubjects.length ? plan.secondarySubjects : analysis.visualKeywords).join("; ") || "editorial supporting context"}

Organizations mentioned:
${analysis.namedOrganizations.join(", ") || "none highlighted"}

Required composition:
${plan.composition}

Visual event:
${plan.visualEvent}

Camera / lighting / mood:
${plan.cameraAngle}; ${plan.lighting}; ${plan.mood}

Color palette:
${plan.colorPalette}

Editorial style:
${plan.editorialStyle}

Must include:
${plan.mustInclude.join("; ") || mainSubject}

Must avoid:
${plan.mustAvoid.join("; ")}

Style requirements:
- Premium digital newsroom editorial quality
- Bright, clear, high-visibility lighting suitable for a news website card
- Immediately understandable at thumbnail size
- One clear visual focal point
- Strong subject-background separation
- Realistic lighting and natural proportions
- Clean, modern, uncluttered composition
- High detail without visual noise
- Relevant Indian context where appropriate
- Landscape featured-image composition (about 16:9)
- Professional color balance
- Suitable for desktop cards, mobile cards, social sharing and Google Discover
- Leave clean lower-third visual space for an optional later HTML/SVG headline overlay
- Do NOT render Hindi/Devanagari text in the picture (glyphs often break)

${QUALITY_DIRECTIVES}

${personBlock}

${categoryRules(input.categoryId)}

${accuracyBlock()}

The image must make a reader instantly understand the news topic of this headline:
${headline}.`;
}

/** @deprecated Prefer buildProfessionalNewsImagePrompt — kept for callers. */
export function buildNeutralIllustrationPrompt(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  plan?: NewsVisualPlan
): string {
  return buildProfessionalNewsImagePrompt({
    input,
    analysis,
    plan: plan || {
      mainSubject: analysis.primarySubject,
      secondarySubjects: analysis.visualKeywords,
      locationContext: analysis.location,
      visualEvent: analysis.factualVisualSummary,
      composition: "clear central subject, uncluttered background",
      cameraAngle: "eye-level",
      lighting: "natural news lighting",
      mood: "serious editorial",
      colorPalette: "navy and neutrals",
      editorialStyle: "premium newsroom",
      mustInclude: [analysis.primarySubject],
      mustAvoid: ["fake text", "watermarks"],
      overlayTextRecommended: false,
      safeForGeneration: true,
      reason: "legacy",
    },
    neutral: true,
  });
}

/** @deprecated Prefer buildProfessionalNewsImagePrompt — kept for callers. */
export function buildOpenAiImagePrompt(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  plan?: NewsVisualPlan
): string {
  return buildProfessionalNewsImagePrompt({
    input,
    analysis,
    plan: plan || {
      mainSubject: analysis.primarySubject,
      secondarySubjects: analysis.visualKeywords,
      locationContext: analysis.location,
      visualEvent: analysis.factualVisualSummary,
      composition: "clear central subject, center-weighted focal point",
      cameraAngle: "eye-level",
      lighting: "natural news lighting",
      mood: "serious editorial",
      colorPalette: "navy and neutrals",
      editorialStyle: "premium newsroom",
      mustInclude: [analysis.primarySubject],
      mustAvoid: ["fake text", "watermarks"],
      overlayTextRecommended: false,
      safeForGeneration: true,
      reason: "legacy",
    },
    neutral: false,
  });
}
