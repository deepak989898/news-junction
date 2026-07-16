import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { NewsVisualPlan } from "./visual-plan";
import type { NewsVisualStory } from "./visual-story";
import { rewritePromptForStoryComprehension } from "./visual-story";
import type { StoryAnalysisResult } from "./story-analyzer";
import { IMAGE_TEXT_HARD_RULES, toLatinImageText } from "./image-text-rules";

export const QUALITY_DIRECTIVES = `Technical quality requirements:
- Bright, well-lit editorial photography — clear faces, readable at thumbnail size
- Soft professional or warm cinematic lighting with visible detail in shadows (entertainment may use warmer cinema light)
- Ultra-sharp focus on the main subject, crisp edges, no motion blur, no soft focus
- Professional Reuters/AP/BBC/Variety/Deadline editorial quality with proper exposure and rich natural colors
- High clarity and contrast — NOT faded, NOT washed out, NOT hazy, NOT low-resolution looking
- Single unified photograph/scene only — absolutely NO split-screen, NO diptych, NO side-by-side panels, NO before/after layout, NO collage, NO multiple frames
- ONE coherent scene filling the entire landscape frame edge to edge
- Strong subject-background separation, immediately readable at thumbnail size
- Frame balance: main person ~60-70%, supporting branding ~20-25%, background ~10-15%
- Logos, documents, and icons must NEVER be larger than the main subject

${IMAGE_TEXT_HARD_RULES}`;

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
- Premium entertainment / cinema / OTT poster atmosphere
- Warm cinematic lighting, soft bokeh background
- Lead talent portrait dominant; title and platform branding secondary
- Platform logos natural and SMALLER than the main person
- Movie/series title lettering ONLY in English transliteration (Latin alphabet) — never Telugu/Tamil/Hindi script
- Avoid false celebrity likenesses or invented award scenes
- Never invent paperwork, contracts, laptops, microphones, courtrooms, or crowds
- Never render tofu/box glyphs or red garbled subtitle bars`,
  duniya: `WORLD visual rules:
- Region-accurate landmarks or diplomatic/civic atmosphere matching the story location`,
  rajya: `STATE / LOCAL visual rules:
- Regional civic infrastructure, administration, roads, public facilities, or accurate local atmosphere`,
  desh: `NATIONAL visual rules:
- Indian civic context, parliament exterior, major city skyline, policy/event atmosphere — neutral and credible`,
  video: `MEDIA visual rules:
- Broadcast studio, camera lighting, newsroom production atmosphere`,
  court: `COURT / LEGAL visual rules:
- Court building exterior, scales of justice, legal documents, gavel as symbolic support ONLY for legal stories
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

function accuracyBlock(isEntertainment: boolean): string {
  return `Accuracy requirements:
- Represent only facts supported by the article context
- Do NOT invent numbers, dates, quotes, statistics, Sensex/Nifty values, stock prices, or match scores
- Do NOT fabricate a specific press-event photograph
- Do NOT imply the image is an authentic wire photo from the event
- Do NOT add unrelated people, buildings, flags, or oversized logos
- Do NOT invent paperwork, contracts, laptops, microphones, or courtrooms unless the article mentions them
- Do NOT create misleading facial expressions or actions
- Do NOT portray allegations as proven facts
${isEntertainment ? "- Do NOT invent fake movie scenes, fake awards, or fake audiences" : ""}

Avoid:
- Unreadable text, misspelled words, fake quotes, fake LIVE/BREAKING stamps
- Hindi/Tamil/Telugu/any Indic script lettering, tofu □□□ boxes, mojibake, red garbled text bars
- Fake stock-market values or random charts with digits
- Duplicate objects, extra fingers, distorted faces, deformed buildings
- Watermarks, website logos, collage overload, clickbait unrelated composition
- Pasting the full article headline as image text
- Making any logo or document larger than the main person`;
}

export function buildProfessionalNewsImagePrompt(args: {
  input: ImagePipelineInput;
  analysis: ArticleImageAnalysis;
  plan: NewsVisualPlan;
  neutral: boolean;
  story?: NewsVisualStory;
  storyAnalysis?: StoryAnalysisResult | null;
}): string {
  const { input, analysis, plan, neutral, story, storyAnalysis } = args;
  const headline = toLatinImageText(input.titleEn || "", "") || toLatinImageText(input.titleHi || "", "news story");
  const summary = toLatinImageText(
    (input.summaryEn || input.summaryHi || analysis.factualVisualSummary).replace(/\s+/g, " ").slice(0, 360),
    ""
  );
  const latinMovieTitle = toLatinImageText(
    story?.movieTitle || storyAnalysis?.movieTitle || plan.secondarySubject || "",
    ""
  );
  const latinPlatform = toLatinImageText(story?.platform || storyAnalysis?.platform || "", "");
  const isEntertainment =
    story?.imageType === "ENTERTAINMENT" ||
    Boolean(storyAnalysis?.isEntertainment) ||
    input.categoryId === "manoranjan";
  const personLed =
    !neutral &&
    (isEntertainment ||
      Boolean(story && (story.imageType === "REAL_PUBLIC_FIGURE" || story.imageType === "POLITICIAN")) ||
      analysis.isRealPersonPrimary ||
      analysis.namedPeople.length > 0);
  const mainSubject = neutral
    ? "neutral symbolic scene related to the topic — NOT any real person's face or likeness"
    : toLatinImageText(story?.mainSubject || plan.mainSubject || analysis.primarySubject || "", "main subject");

  const isLegal =
    story?.imageType === "LEGAL" ||
    story?.imageType === "CRIME" ||
    /\b(court|settlement|lawsuit|arrest|verdict)\b/i.test(`${headline} ${summary}`);

  const personBlock = personLed
    ? isEntertainment
      ? `Entertainment / celebrity editorial rules:
- Main focus: photorealistic editorial portrait of ${mainSubject}
- Person occupies about 60-70% of the frame; face fully visible, high likeness for a news thumbnail
- Supporting elements only: ${latinMovieTitle || "English movie title branding"}, ${
          latinPlatform || "streaming platform if relevant"
        } logo SMALLER than the person
- Title text MUST be English transliteration only (e.g. "Maa Inti Bangaaram") — absolutely NO Telugu/Tamil/Hindi script
- NEVER invent paperwork, contracts, laptops, microphones, courtrooms, awards, or crowds
- NEVER let platform logos dominate the frame
- NEVER draw tofu boxes, empty rectangles, or red garbled subtitle bars
- Warm cinematic soft lighting; premium entertainment poster composition
- Chest-up or three-quarter framing`
      : `Real-person / public-figure editorial rules:
- Main focus: photorealistic editorial portrait of ${mainSubject}
- Person occupies about 60-70% of the frame; face fully visible, high likeness for a news thumbnail
- Supporting elements only: ${
          story?.organizations.join(", ") || analysis.namedOrganizations.join(", ") || "relevant institutions"
        }${isLegal ? "; subtle legal/event cue only if grounded in the article" : ""}
- NEVER invent paperwork, settlement documents, or court props unless this is legal news
- NEVER make scales of justice, gavel, empty courtroom, or generic legal clipart the primary subject
- Neutral journalistic expression; do not invent criminal or humiliating poses
- Bright clear lighting for face detail; chest-up or three-quarter framing
- No non-English script text in the image`
    : "";

  const categoryIdForRules = isEntertainment
    ? "manoranjan"
    : personLed && input.categoryId === "manoranjan"
      ? "manoranjan"
      : personLed
        ? input.categoryId === "rajniti" || input.categoryId === "desh"
          ? input.categoryId
          : input.categoryId || "desh"
        : input.categoryId;

  // Keep political person stories on their category; entertainment uses manoranjan; other person-led keep category (not force desh).
  const resolvedCategory = isEntertainment
    ? "manoranjan"
    : personLed && !["manoranjan", "khel", "vyapar", "rajniti", "swasthya", "technology"].includes(input.categoryId)
      ? input.categoryId || "desh"
      : categoryIdForRules;

  const entertainmentBlock =
    isEntertainment && plan.entertainmentTemplate
      ? `\nEntertainment prompt template:\n${plan.entertainmentTemplate}\n\n${IMAGE_TEXT_HARD_RULES}\n`
      : isEntertainment
        ? `\nEntertainment prompt template:
Create a premium editorial entertainment news thumbnail.
Primary subject: ${mainSubject}
Supporting subject: ${latinMovieTitle || "English title"}
Streaming platform: ${latinPlatform || "platform if relevant"}
Visual focus: Actor portrait, English movie title lettering, Platform logo (smaller than actor)
Professional entertainment lighting, premium movie poster composition, warm cinematic colors
No fake movie scenes, no random paperwork, no fake awards, no fake audience, no generic background
No Hindi/Tamil/Telugu/Devanagari lettering — English transliteration only for titles
One clear entertainment story.

${IMAGE_TEXT_HARD_RULES}\n`
        : "";

  let prompt = `Create a premium editorial news illustration for a trusted digital news website (News Junction), similar in clarity to BBC/Reuters/AP${
    isEntertainment ? "/Variety/Deadline/IMDb News" : ""
  } thumbnails.

Article headline:
${headline}

Article summary:
${summary}

Image type:
${story?.imageType || plan.imageType || analysis.subjectType}

News category:
${input.categoryNameEn} (${input.categoryId})

Location:
${story?.location || plan.locationContext || analysis.location || "story location"}

Main visual subject (HIGHEST PRIORITY):
${mainSubject}

Visual priority ranking (strict order):
${(story?.visualPriority || plan.visualPriority || []).join(" > ") || mainSubject}

Visual story:
${story?.visualStory || plan.visualStory || plan.visualEvent}

Supporting visual elements:
${(story?.secondarySubjects.length ? story.secondarySubjects : plan.secondarySubjects).join("; ") || plan.secondarySubject || "editorial supporting context"}

Organizations / platforms (supporting only — never larger than main subject):
${(story?.organizations.length ? story.organizations : analysis.namedOrganizations).join(", ") || "none highlighted"}

Event:
${story?.eventSummary || plan.visualEvent}

Objects allowed:
${(plan.objects || []).join("; ") || "only objects grounded in the article"}

Background:
${plan.background}

Required composition:
${story?.compositionRule || plan.composition}

Frame balance:
${plan.frameBalance}

Camera / lighting / mood:
${plan.cameraAngle}; ${plan.lighting}; ${plan.mood}

Color palette:
${plan.colorPalette}

Editorial style:
${plan.editorialStyle}

Must include:
${(story?.mustInclude.length ? story.mustInclude : plan.mustInclude).join("; ") || mainSubject}

Must avoid:
${(story?.mustAvoid.length ? story.mustAvoid : plan.mustAvoid).join("; ")}

Style requirements:
- Premium digital newsroom editorial quality${isEntertainment ? " / entertainment poster quality" : ""}
- Clear, high-visibility lighting suitable for a news website card
- Immediately understandable at thumbnail size within 2-3 seconds
- One clear visual focal point and one clear visual story
- Strong subject-background separation
- Realistic lighting and natural proportions
- Clean, modern, uncluttered composition
- Fill the full 3:2 / 1536×1024 frame with the photographic subject — no letterboxing, no fake UI chrome
- Do NOT leave empty lower-third bars or draw news graphics on top of the photo
${entertainmentBlock}
${QUALITY_DIRECTIVES}

${personBlock}

${categoryRules(resolvedCategory)}

${accuracyBlock(isEntertainment)}

${IMAGE_TEXT_HARD_RULES}

The image must visually answer WHO / WHAT happened / WHERE / WHICH organization / WHY it is news — without requiring the reader to open the article.

The visual must immediately communicate this headline:
${headline}.`;

  if (story && (story.storyScore < 85 || !story.understandsWithoutReading || personLed || isEntertainment)) {
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
      secondarySubject: analysis.visualKeywords[0] || "",
      locationContext: analysis.location,
      visualEvent: analysis.factualVisualSummary,
      visualStory: analysis.factualVisualSummary,
      objects: [],
      background: "uncluttered editorial background",
      composition: "clear central subject, uncluttered background",
      cameraAngle: "eye-level",
      lighting: "natural news lighting",
      mood: "serious editorial",
      colorPalette: "navy and neutrals",
      editorialStyle: "premium newsroom",
      mustInclude: [analysis.primarySubject],
      mustAvoid: ["fake text", "watermarks"],
      avoid: ["fake text", "watermarks"],
      visualPriority: [analysis.primarySubject],
      frameBalance: "Main person ~60%; supporting ~25%; background ~15%",
      imageType: "GENERIC",
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
      secondarySubject: analysis.visualKeywords[0] || "",
      locationContext: analysis.location,
      visualEvent: analysis.factualVisualSummary,
      visualStory: analysis.factualVisualSummary,
      objects: [],
      background: "uncluttered editorial background",
      composition: "clear central subject, center-weighted focal point",
      cameraAngle: "eye-level",
      lighting: "natural news lighting",
      mood: "serious editorial",
      colorPalette: "navy and neutrals",
      editorialStyle: "premium newsroom",
      mustInclude: [analysis.primarySubject],
      mustAvoid: ["fake text", "watermarks"],
      avoid: ["fake text", "watermarks"],
      visualPriority: [analysis.primarySubject],
      frameBalance: "Main person ~60%; supporting ~25%; background ~15%",
      imageType: "GENERIC",
      overlayTextRecommended: false,
      safeForGeneration: true,
      reason: "legacy",
    },
    neutral: false,
  });
}
