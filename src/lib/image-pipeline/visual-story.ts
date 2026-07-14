import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { StoryAnalysisResult } from "./story-analyzer";
import { getEntertainmentLayout } from "./entertainment-styles";

export type ImageStoryType =
  | "REAL_PUBLIC_FIGURE"
  | "POLITICIAN"
  | "SPORTS"
  | "BUSINESS"
  | "CRIME"
  | "LEGAL"
  | "COMPANY"
  | "PRODUCT"
  | "EVENT"
  | "WEATHER"
  | "LOCAL_NEWS"
  | "ENTERTAINMENT"
  | "GENERIC";

export type VisualImportanceScores = {
  mainPerson: number;
  organization: number;
  event: number;
  objects: number;
  background: number;
  genericSymbols: number;
};

export type NewsVisualStory = {
  imageType: ImageStoryType;
  mainSubject: string;
  secondarySubjects: string[];
  organizations: string[];
  eventSummary: string;
  location: string;
  visualStory: string;
  compositionRule: string;
  mustInclude: string[];
  mustAvoid: string[];
  importance: VisualImportanceScores;
  storyScore: number;
  understandsWithoutReading: boolean;
  reason: string;
  entertainmentStyle?: string | null;
  visualPriority?: string[];
  platform?: string;
  movieTitle?: string;
};

const PERSON_HINT =
  /\b(pm|prime minister|president|minister|ceo|founder|actor|actress|cricketer|player|captain|judge|commissioner|mayor|king|queen|singer|director|coach|mp|mla|cm)\b/i;

const GENERIC_SYMBOL_BAN =
  /\b(scale(?:s)? of justice|gavel|blind justice|generic court(?:room)?|empty courtroom|justice scale)\b/i;

const LEGAL_STORY_RE =
  /\b(court|settlement|lawsuit|arrest|verdict|tribunal|charges?|fir\b|bail|police\s+case|legal)\b/i;

function uniq(items: string[]): string[] {
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

function scoreStory(story: Omit<NewsVisualStory, "storyScore" | "understandsWithoutReading" | "reason">): {
  storyScore: number;
  understandsWithoutReading: boolean;
  reason: string;
} {
  let score = 0;
  const hasPerson = story.importance.mainPerson >= 80 && Boolean(story.mainSubject);
  const hasEvent = story.importance.event >= 70 && Boolean(story.eventSummary);
  const hasOrg = story.importance.organization >= 60 && story.organizations.length > 0;
  const hasLocation = Boolean(story.location);
  const bansGeneric = story.mustAvoid.some((x) => GENERIC_SYMBOL_BAN.test(x)) || story.importance.genericSymbols <= 25;

  if (hasPerson) score += 25;
  if (hasEvent) score += 25;
  if (hasOrg) score += 15;
  if (hasLocation) score += 10;
  score += 10; // composition baseline for portrait/editorial
  score += 10; // editorial quality target
  score += 5; // thumbnail clarity target
  if (!bansGeneric && hasPerson) score -= 20;
  if (GENERIC_SYMBOL_BAN.test(story.visualStory)) score -= 25;
  if (story.imageType === "ENTERTAINMENT" && hasPerson && hasEvent) score += 5;

  const understandsWithoutReading = hasPerson && hasEvent && score >= 70;
  return {
    storyScore: Math.max(0, Math.min(100, score)),
    understandsWithoutReading,
    reason: understandsWithoutReading
      ? "Story communicates who + what + org/event"
      : "Story still too generic — rewrite required",
  };
}

function classifyImageType(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storyAnalysis?: StoryAnalysisResult | null
): ImageStoryType {
  if (storyAnalysis?.isEntertainment || storyAnalysis?.entertainmentStyle) return "ENTERTAINMENT";
  const text = `${input.titleEn} ${input.titleHi} ${input.summaryEn} ${input.summaryHi}`.toLowerCase();
  if (input.categoryId === "manoranjan") return "ENTERTAINMENT";
  if (/film|movie|cinema|ott|streaming|bollywood|actress|actor|trailer/.test(text)) return "ENTERTAINMENT";
  if (analysis.isRealPersonPrimary || analysis.namedPeople.length > 0 || PERSON_HINT.test(text)) {
    if (/minister|prime minister|president|election|mp\b|mla\b|cm\b|politic/.test(text)) return "POLITICIAN";
    return "REAL_PUBLIC_FIGURE";
  }
  if (/cricket|match|tournament|football|ipl|olympic|sport/.test(text) || input.categoryId === "khel") return "SPORTS";
  if (/stock|market|ipo|share|bank|rupee|business|ceo/.test(text) || input.categoryId === "vyapar") return "BUSINESS";
  if (/murder|crime|police|arrest|theft|fraud/.test(text)) return "CRIME";
  if (/court|settlement|lawsuit|tribunal|verdict|legal|met\b|police/.test(text) || input.categoryId === "court") return "LEGAL";
  if (/rain|flood|cyclone|heatwave|weather|storm/.test(text) || input.categoryId === "mausam") return "WEATHER";
  if (analysis.namedOrganizations.length) return "COMPANY";
  if (/launch|summit|festival|protest|rally/.test(text)) return "EVENT";
  if (input.categoryId === "rajya") return "LOCAL_NEWS";
  return "GENERIC";
}

/**
 * Build a person-first visual story so we never fall back to generic category symbols
 * when a real public figure / specific event exists.
 */
export function buildNewsVisualStory(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis,
  storyAnalysis?: StoryAnalysisResult | null
): NewsVisualStory {
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 320);
  const text = `${headline} ${summary}`;
  const imageType = classifyImageType(input, analysis, storyAnalysis);
  const isEntertainment = imageType === "ENTERTAINMENT";
  const isLegalContext =
    imageType === "LEGAL" ||
    imageType === "CRIME" ||
    LEGAL_STORY_RE.test(text);

  const person =
    storyAnalysis?.mainSubject ||
    analysis.namedPeople[0] ||
    (analysis.isRealPersonPrimary ? analysis.primarySubject : "") ||
    "";

  const platform = storyAnalysis?.platform || "";
  const movieTitle = storyAnalysis?.movieTitle || "";
  const layout = getEntertainmentLayout(storyAnalysis?.entertainmentStyle);

  const orgs = uniq([
    ...(platform ? [platform] : []),
    ...analysis.namedOrganizations,
    ...(/met(?:ropolitan)? police/i.test(text) ? ["Metropolitan Police"] : []),
    ...(/\bX\b|twitter/i.test(text) ? ["X (Twitter)"] : []),
  ]).slice(0, 4);

  const isPersonLed =
    imageType === "REAL_PUBLIC_FIGURE" ||
    imageType === "POLITICIAN" ||
    imageType === "ENTERTAINMENT" ||
    Boolean(person);

  const importance: VisualImportanceScores = isEntertainment
    ? {
        mainPerson: 100,
        organization: platform ? 55 : 35,
        event: 90,
        objects: 25,
        background: 20,
        genericSymbols: 5,
      }
    : isPersonLed
      ? {
          mainPerson: 100,
          organization: orgs.length ? 70 : 40,
          event: 90,
          objects: isLegalContext ? 55 : 30,
          background: 40,
          genericSymbols: 15,
        }
      : {
          mainPerson: 20,
          organization: orgs.length ? 80 : 40,
          event: 85,
          objects: 70,
          background: 55,
          genericSymbols: 35,
        };

  const entertainmentAvoid = [
    "random paper / contract / legal document",
    "laptop unless mentioned in article",
    "random microphone",
    "courtroom / gavel / scales of justice",
    "fake awards or trophies",
    "invented audience crowd",
    "collage or split-screen",
    "platform logo larger than the main person",
    "unreadable or fake Hindi text",
  ];

  const mustAvoid = uniq([
    "generic scales of justice as the main subject",
    "isolated gavel close-up",
    "empty courtroom with no story context",
    "category-only legal clipart",
    "unreadable or fake Hindi text",
    "fake quotes",
    "watermarks",
    "collage overload",
    "misspelled logos",
    ...(isEntertainment || !isLegalContext
      ? [
          "random paperwork or contracts",
          "invented legal documents",
          "arrest/settlement props unless the article is legal news",
        ]
      : []),
    ...(isEntertainment ? entertainmentAvoid : []),
    ...(layout?.mustAvoidHints || []),
  ]);

  const mustInclude = uniq(
    isEntertainment
      ? [
          `Photorealistic editorial portrait of ${person || analysis.primarySubject} occupying ~60-70% of frame`,
          ...(movieTitle ? [`Movie/series title branding for "${movieTitle}" (secondary, ~20-25%)`] : []),
          ...(platform
            ? [`${platform} platform logo natural and SMALLER than the main person (~10-15%)`]
            : []),
          "Warm cinematic soft lighting; premium entertainment poster composition",
          "One clear entertainment story readable at thumbnail size",
          ...(layout?.mustIncludeHints || []),
        ]
      : isPersonLed
        ? [
            `Photorealistic editorial portrait of ${person || analysis.primarySubject}`,
            ...orgs.map((o) => `${o} institutional / brand cue (supporting only)`),
            "Person occupies about 60-70% of the frame",
            ...(isLegalContext
              ? ["Subtle legal/event cue only if supported by the article — no invented case numbers"]
              : []),
          ]
        : [analysis.primarySubject, analysis.location, ...analysis.visualKeywords.slice(0, 3)].filter(Boolean)
  );

  const eventSummary =
    storyAnalysis?.understanding.whatHappened ||
    analysis.factualVisualSummary.slice(0, 200) ||
    summary.slice(0, 200) ||
    headline;

  const visualStory = isEntertainment
    ? (
        storyAnalysis?.understanding.bestVisual ||
        `Premium entertainment thumbnail: large editorial portrait of ${
          person || analysis.primarySubject
        } (~60-70% of frame). Supporting: ${
          movieTitle ? `title "${movieTitle}"` : "film/series branding"
        }${platform ? `; ${platform} logo smaller than the person` : ""}. Warm cinematic lighting, soft bokeh background. Communicate: ${eventSummary}. No paperwork, no collage, no invented props.`
      )
    : isPersonLed
      ? `Editorial portrait of ${person || analysis.primarySubject} as the clear main focus (~60% of frame). Supporting cues: ${
          orgs.join(", ") || "relevant context"
        }. Communicate the event: ${eventSummary}. ${
          isLegalContext
            ? "Subtle legal/institutional context only if grounded in the article."
            : "Do not invent paperwork, court props, or unrelated objects."
        } Bright professional newsroom lighting. Background only supports the story.`
      : `Story-specific editorial scene for: ${headline}. Focus on the concrete event and subjects, not category symbols.`;

  const compositionRule = isEntertainment
    ? layout?.composition ||
      "Lead actor portrait dominant left/center (~60-70%); title branding secondary; platform logo smaller than person; soft cinematic background; no clutter"
    : isPersonLed
      ? "Chest-up or three-quarter portrait dominant left/center; supporting org/event cues secondary; one clear visual story"
      : "Single clear focal subject; uncluttered 16:9 editorial framing";

  const draft: Omit<NewsVisualStory, "storyScore" | "understandsWithoutReading" | "reason"> = {
    imageType,
    mainSubject: isPersonLed ? person || analysis.primarySubject || headline : analysis.primarySubject || headline,
    secondarySubjects: uniq([
      ...(storyAnalysis?.secondarySubjects || []),
      ...(movieTitle ? [movieTitle] : []),
      ...(platform ? [platform] : []),
      ...orgs,
      ...analysis.visualKeywords,
    ]).slice(0, 6),
    organizations: orgs,
    eventSummary,
    location: analysis.location || (/\buk\b|britain|london|heathrow|england/i.test(text) ? "United Kingdom" : ""),
    visualStory,
    compositionRule,
    mustInclude,
    mustAvoid,
    importance,
    entertainmentStyle: storyAnalysis?.entertainmentStyle || null,
    visualPriority: storyAnalysis?.visualPriority || [],
    platform,
    movieTitle,
  };

  const scored = scoreStory(draft);
  return { ...draft, ...scored };
}

/** Rewrite / strengthen a prompt when the story score fails the thumbnail-comprehension bar. */
export function rewritePromptForStoryComprehension(
  basePrompt: string,
  story: NewsVisualStory,
  extraNotes?: string
): string {
  return `${basePrompt}

CRITICAL VISUAL STORY OVERRIDE (must obey):
- Image type: ${story.imageType}
- Main subject (HIGHEST PRIORITY, ~60-70% of frame if person): ${story.mainSubject}
- Visual priority ranking: ${(story.visualPriority || []).join(" > ") || "main subject first"}
- Organizations / platforms (supporting only): ${story.organizations.join(", ") || "none"}
- Event: ${story.eventSummary}
- Visual story: ${story.visualStory}
- Composition: ${story.compositionRule}
- Must include: ${story.mustInclude.join("; ")}
- Must avoid: ${story.mustAvoid.join("; ")}
- Importance: person ${story.importance.mainPerson}, org ${story.importance.organization}, event ${story.importance.event}, genericSymbols ${story.importance.genericSymbols}
- Frame balance: main person ~60%, supporting ~25%, background ~15%. Logos/documents/icons must NEVER exceed the main subject size.
- Someone viewing the thumbnail must answer: WHO / WHAT / WHERE / WHICH ORG / WHY without reading the article.
- NEVER make scales of justice, gavel, paperwork, or generic court clipart the primary subject when a named person exists.
${extraNotes ? `- Extra fix notes: ${extraNotes}` : ""}`;
}

export function isGenericSymbolPrompt(prompt: string): boolean {
  return GENERIC_SYMBOL_BAN.test(prompt) && !/\bportrait of\b|\beditorial portrait\b/i.test(prompt);
}
