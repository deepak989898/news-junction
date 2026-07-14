import "server-only";

import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

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
};

const PERSON_HINT =
  /\b(pm|prime minister|president|minister|ceo|founder|actor|actress|cricketer|player|captain|judge|commissioner|mayor|king|queen|singer|director|coach|mp|mla|cm)\b/i;

const GENERIC_SYMBOL_BAN =
  /\b(scale(?:s)? of justice|gavel|blind justice|generic court(?:room)?|empty courtroom|justice scale)\b/i;

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

  const understandsWithoutReading = hasPerson && hasEvent && score >= 70;
  return {
    storyScore: Math.max(0, Math.min(100, score)),
    understandsWithoutReading,
    reason: understandsWithoutReading
      ? "Story communicates who + what + org/event"
      : "Story still too generic — rewrite required",
  };
}

function classifyImageType(input: ImagePipelineInput, analysis: ArticleImageAnalysis): ImageStoryType {
  const text = `${input.titleEn} ${input.titleHi} ${input.summaryEn} ${input.summaryHi}`.toLowerCase();
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
  analysis: ArticleImageAnalysis
): NewsVisualStory {
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 320);
  const imageType = classifyImageType(input, analysis);
  const person =
    analysis.namedPeople[0] ||
    (analysis.isRealPersonPrimary ? analysis.primarySubject : "") ||
    "";
  const orgs = uniq([
    ...analysis.namedOrganizations,
    ...(/met(?:ropolitan)? police/i.test(headline + summary) ? ["Metropolitan Police"] : []),
    ...(/\b\bX\b|twitter/i.test(headline + summary) ? ["X (Twitter)"] : []),
  ]).slice(0, 4);

  const isPersonLed =
    imageType === "REAL_PUBLIC_FIGURE" ||
    imageType === "POLITICIAN" ||
    Boolean(person);

  const importance: VisualImportanceScores = isPersonLed
    ? {
        mainPerson: 100,
        organization: orgs.length ? 90 : 40,
        event: 90,
        objects: 60,
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
  ]);

  const mustInclude = uniq(
    isPersonLed
      ? [
          `Photorealistic editorial portrait of ${person || analysis.primarySubject}`,
          ...orgs.map((o) => `${o} institutional / brand cue`),
          "Clear settlement / arrest / legal-event cue without inventing case numbers",
          "Person occupies about 55-65% of the frame",
        ]
      : [analysis.primarySubject, analysis.location, ...analysis.visualKeywords.slice(0, 3)].filter(Boolean)
  );

  const eventSummary =
    analysis.factualVisualSummary.slice(0, 200) ||
    summary.slice(0, 200) ||
    headline;

  const visualStory = isPersonLed
    ? `Editorial portrait of ${person || analysis.primarySubject} as the clear main focus (~60% of frame). Supporting cues: ${
        orgs.join(", ") || "relevant institutions"
      }. Communicate the event: ${eventSummary}. Supporting legal/settlement paperwork and platform context if relevant. Bright professional newsroom lighting. Background only supports the story.`
    : `Story-specific editorial scene for: ${headline}. Focus on the concrete event and subjects, not category symbols.`;

  const compositionRule = isPersonLed
    ? "Chest-up or three-quarter portrait dominant left/center; supporting props/org cues on the opposite side; one clear visual story"
    : "Single clear focal subject; uncluttered 16:9 editorial framing";

  const draft = {
    imageType,
    mainSubject: isPersonLed ? person || analysis.primarySubject || headline : analysis.primarySubject || headline,
    secondarySubjects: uniq([...orgs, ...analysis.visualKeywords]).slice(0, 6),
    organizations: orgs,
    eventSummary,
    location: analysis.location || (/\buk\b|britain|london|heathrow|england/i.test(headline + summary) ? "United Kingdom" : ""),
    visualStory,
    compositionRule,
    mustInclude,
    mustAvoid,
    importance,
  };

  const scored = scoreStory(draft);
  return { ...draft, ...scored };
}

/** Rewrite / strengthen a prompt when the story score fails the thumbnail-comprehension bar. */
export function rewritePromptForStoryComprehension(
  basePrompt: string,
  story: NewsVisualStory
): string {
  return `${basePrompt}

CRITICAL VISUAL STORY OVERRIDE (must obey):
- Image type: ${story.imageType}
- Main subject (HIGHEST PRIORITY, ~60% of frame if person): ${story.mainSubject}
- Organizations: ${story.organizations.join(", ") || "none"}
- Event: ${story.eventSummary}
- Visual story: ${story.visualStory}
- Composition: ${story.compositionRule}
- Must include: ${story.mustInclude.join("; ")}
- Must avoid: ${story.mustAvoid.join("; ")}
- Importance: person ${story.importance.mainPerson}, org ${story.importance.organization}, event ${story.importance.event}, genericSymbols ${story.importance.genericSymbols}
- Someone viewing the thumbnail must answer: WHO / WHAT / WHERE / WHICH ORG / WHY without reading the article.
- NEVER make scales of justice, gavel, or generic court clipart the primary subject when a named person exists.`;
}

export function isGenericSymbolPrompt(prompt: string): boolean {
  return GENERIC_SYMBOL_BAN.test(prompt) && !/\bportrait of\b|\beditorial portrait\b/i.test(prompt);
}
