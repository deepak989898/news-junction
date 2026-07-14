import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { NewsVisualPlan } from "./visual-plan";
import type { NewsVisualStory } from "./visual-story";
import { rewritePromptForStoryComprehension } from "./visual-story";

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
  story?: NewsVisualStory;
}): string {
  const { input, analysis, plan, neutral, story } = args;
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || analysis.factualVisualSummary)
    .replace(/\s+/g, " ")
    .slice(0, 360);
  const personLed =
    !neutral &&
    (Boolean(story && (story.imageType === "REAL_PUBLIC_FIGURE" || story.imageType === "POLITICIAN")) ||
      analysis.isRealPersonPrimary ||
      analysis.namedPeople.length > 0);
  const mainSubject = neutral
    ? "neutral symbolic scene related to the topic — NOT any real person's face or likeness"
    : story?.mainSubject || plan.mainSubject || analysis.primarySubject;

  const personBlock = personLed
    ? `Real-person / public-figure editorial rules:
- Main focus: photorealistic editorial portrait of ${mainSubject}
- Person occupies about 55-65% of the frame; face fully visible, high likeness for a news thumbnail
- Supporting elements only: ${story?.organizations.join(", ") || analysis.namedOrganizations.join(", ") || "relevant institutions"}, settlement/legal document cues, subtle platform context if relevant
- NEVER make scales of justice, gavel, empty courtroom, or generic legal clipart the primary subject
- Neutral journalistic expression; do not invent criminal or humiliating poses
- Bright clear lighting for face detail; chest-up or three-quarter framing`
    : "";

  let prompt = `Create a premium editorial news illustration for a trusted digital news website (News Junction), similar in clarity to BBC/Reuters/AP thumbnails.

Article headline:
${headline}

Article summary:
${summary}

Image type:
${story?.imageType || analysis.subjectType}

News category:
${input.categoryNameEn} (${input.categoryId})

Location:
${story?.location || plan.locationContext || analysis.location || "story location"}

Main visual subject (HIGHEST PRIORITY):
${mainSubject}

Visual story:
${story?.visualStory || plan.visualEvent}

Supporting visual elements:
${(story?.secondarySubjects.length ? story.secondarySubjects : plan.secondarySubjects).join("; ") || "editorial supporting context"}

Organizations:
${(story?.organizations.length ? story.organizations : analysis.namedOrganizations).join(", ") || "none highlighted"}

Event:
${story?.eventSummary || plan.visualEvent}

Required composition:
${story?.compositionRule || plan.composition}

Camera / lighting / mood:
${plan.cameraAngle}; bright professional newsroom lighting; ${plan.mood}

Color palette:
${plan.colorPalette}

Editorial style:
${plan.editorialStyle}

Must include:
${(story?.mustInclude.length ? story.mustInclude : plan.mustInclude).join("; ") || mainSubject}

Must avoid:
${(story?.mustAvoid.length ? story.mustAvoid : plan.mustAvoid).join("; ")}

Style requirements:
- Premium digital newsroom editorial quality
- Bright, clear, high-visibility lighting suitable for a news website card
- Immediately understandable at thumbnail size within 2-3 seconds
- One clear visual focal point and one clear visual story
- Strong subject-background separation
- Realistic lighting and natural proportions
- Clean, modern, uncluttered composition
- Do NOT render Hindi/Devanagari text in the picture
- Leave clean lower-third space for optional later overlay

${QUALITY_DIRECTIVES}

${personBlock}

${categoryRules(personLed ? "desh" : input.categoryId)}

${accuracyBlock()}

The image must visually answer WHO / WHAT happened / WHERE / WHICH organization / WHY it is news — without requiring the reader to open the article.

The visual must immediately communicate this headline:
${headline}.`;

  if (story && (story.storyScore < 85 || !story.understandsWithoutReading || personLed)) {
    prompt = rewritePromptForStoryComprehension(prompt, story);
  }

  return prompt;
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
