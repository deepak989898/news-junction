import { ArticleImageAnalysis, ImagePipelineInput } from "./types";
import type { EntertainmentStyle } from "./entertainment-styles";

export type StoryUnderstanding = {
  who: string;
  whatHappened: string;
  whyNews: string;
  twoSecondRead: string;
  bestVisual: string;
};

export type StoryAnalysisResult = {
  understanding: StoryUnderstanding;
  visualPriority: string[];
  entertainmentStyle: EntertainmentStyle | null;
  platform: string;
  movieTitle: string;
  mainSubject: string;
  secondarySubjects: string[];
  isEntertainment: boolean;
  canGenerate: boolean;
  reason: string;
};

const OTT_PLATFORM_RE =
  /\b(jio\s*hotstar|jiocinema|netflix|prime\s*video|amazon\s*prime|disney\+|disney\s*plus|sony\s*liv|zee5|hotstar|hulu|apple\s*tv\+|mx\s*player|voot)\b/i;

const STREAMING_RE = /\b(stream(?:ing)?|ott|now\s+on|watch\s+on|releases?\s+on)\b/i;

const ENTERTAINMENT_HINT =
  /\b(film|movie|cinema|actor|actress|bollywood|tollywood|trailer|box\s*office|ott|celebrity|singer|album|award|premiere|series|web\s*series|manoranjan)\b/i;

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

function detectPlatform(text: string): string {
  const m = text.match(OTT_PLATFORM_RE);
  if (!m) return "";
  const raw = m[0].replace(/\s+/g, " ").trim();
  if (/jio\s*hotstar|hotstar/i.test(raw)) return "JioHotstar";
  if (/netflix/i.test(raw)) return "Netflix";
  if (/prime/i.test(raw)) return "Prime Video";
  if (/disney/i.test(raw)) return "Disney+";
  if (/sony\s*liv/i.test(raw)) return "Sony LIV";
  if (/zee5/i.test(raw)) return "ZEE5";
  return raw;
}

function extractQuotedTitle(text: string): string {
  const filmQuoted =
    text.match(/\b(?:film|movie|series)\s+['"‘’“”]([^'"‘’“”]{2,80})['"‘’“”]/i) ||
    text.match(/['"‘’“”]([A-Z][^'"‘’“”]{2,80})['"‘’“”]/);
  if (filmQuoted?.[1]) return filmQuoted[1].trim();
  const titled = text.match(/\b(?:film|movie|series)\s+([A-Z][\w:.'\-\s]{2,60}?)\s+(?:starts|start|streaming|on|released)/i);
  return titled ? titled[1].trim() : "";
}

/** e.g. "Samantha's Film" / "Shah Rukh Khan's movie" */
function extractPossessivePerson(text: string): string {
  const m = text.match(
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})['’]s\s+(?:film|movie|series|album|song|show|web\s*series)\b/i
  );
  return m ? m[1].trim() : "";
}

function detectEntertainmentStyle(
  text: string,
  categoryId: string,
  platform: string
): EntertainmentStyle | null {
  const t = text.toLowerCase();
  const isEnt = categoryId === "manoranjan" || ENTERTAINMENT_HINT.test(t) || Boolean(platform);
  if (!isEnt) return null;
  if (platform || STREAMING_RE.test(t)) return "ott_release";
  if (/trailer|teaser/.test(t)) return "trailer";
  if (/box\s*office|collections?/.test(t)) return "box_office";
  if (/interview|says|opens\s+up/.test(t)) return "celebrity_interview";
  if (/album|song|music|singer/.test(t)) return "music_launch";
  if (/award|filmfare|oscar|national\s+award/.test(t)) return "award_show";
  if (/series|web\s*series|season\s+\d/.test(t)) return "tv_series";
  if (/film|movie|cinema/.test(t)) return "movie_news";
  return categoryId === "manoranjan" ? "movie_news" : null;
}

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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 8);
}

/** Heuristic story analyzer — used when GPT is unavailable or as base. */
export function analyzeStoryHeuristic(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis
): StoryAnalysisResult {
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 420);
  const text = `${headline} ${summary}`;
  const platform = detectPlatform(text);
  const movieTitle = extractQuotedTitle(text);
  const possessivePerson =
    extractPossessivePerson(input.titleEn || input.titleHi) ||
    extractPossessivePerson(text);
  const personFromAnalysis = (analysis.namedPeople || []).find(
    (p) => p && !OTT_PLATFORM_RE.test(p) && p.toLowerCase() !== movieTitle.toLowerCase()
  );
  const person = personFromAnalysis || possessivePerson || "";
  const entertainmentStyle = detectEntertainmentStyle(text, input.categoryId, platform);
  const isEntertainment = Boolean(entertainmentStyle);

  const mainSubject =
    person ||
    (analysis.isRealPersonPrimary &&
    analysis.primarySubject &&
    analysis.primarySubject.toLowerCase() !== movieTitle.toLowerCase() &&
    !OTT_PLATFORM_RE.test(analysis.primarySubject)
      ? analysis.primarySubject
      : "") ||
    movieTitle ||
    analysis.primarySubject ||
    headline;

  const secondarySubjects = uniq(
    [movieTitle, platform, ...analysis.namedOrganizations, ...analysis.visualKeywords]
      .filter(Boolean)
      .filter((x) => x.toLowerCase() !== String(mainSubject).toLowerCase())
  ).slice(0, 6);

  const visualPriority = uniq(
    isEntertainment
      ? [mainSubject, movieTitle, platform, "streaming release"].filter(Boolean)
      : [mainSubject, ...analysis.namedOrganizations, analysis.location].filter(Boolean)
  ).slice(0, 6);

  const who = person || analysis.primarySubject || "unclear subject";
  const whatHappened =
    analysis.factualVisualSummary.slice(0, 160) ||
    (platform ? `${movieTitle || "Title"} starts streaming on ${platform}` : headline);
  const whyNews = platform
    ? `OTT / streaming release on ${platform}`
    : analysis.factualVisualSummary.slice(0, 120) || "newsworthy event";
  const twoSecondRead = isEntertainment
    ? `${who} — ${movieTitle || "film/show"} ${platform ? `on ${platform}` : ""}`.trim()
    : `${who}: ${whatHappened}`.slice(0, 140);
  const bestVisual = isEntertainment
    ? `Premium entertainment poster: portrait of ${who} (~60-70%), title branding, ${platform || "platform"} logo smaller than person`
    : `Editorial focus on ${who} communicating ${whatHappened}`;

  // Always allow generation for every category (sports, politics, business, etc.).
  // Entertainment style is optional branding only — never a gate.
  const canAnswer =
    Boolean(who) &&
    Boolean(whatHappened) &&
    Boolean(bestVisual);

  return {
    understanding: {
      who,
      whatHappened,
      whyNews,
      twoSecondRead,
      bestVisual,
    },
    visualPriority,
    entertainmentStyle,
    platform,
    movieTitle,
    mainSubject,
    secondarySubjects,
    isEntertainment,
    canGenerate: canAnswer,
    reason: canAnswer
      ? isEntertainment
        ? `Entertainment ${entertainmentStyle}: priority ${visualPriority.join(" > ")}`
        : `Editorial image for ${input.categoryId || "news"}: priority ${visualPriority.join(" > ")}`
      : "Cannot answer who/what/best-visual — using headline fallback",
  };
}

/** Category / entertainment mismatch must never block image generation. */
function isCategoryRefusalReason(reason: string): boolean {
  return /does not fit|not (a )?(typical|suitable)|wrong categor|only (for )?entertain|not entertainment|not (a )?movie|outside (of )?entertain|cannot generate.*(entertain|movie)|no (suitable )?entertain/i.test(
    reason
  );
}

function resolveCanGenerate(args: {
  llmCanGenerate: boolean;
  reason: string;
  who: string;
  whatHappened: string;
  bestVisual: string;
  heuristic: StoryAnalysisResult;
}): { canGenerate: boolean; reason: string } {
  const hasBasics =
    Boolean(args.who?.trim()) &&
    Boolean(args.whatHappened?.trim()) &&
    Boolean(args.bestVisual?.trim());

  if (args.llmCanGenerate && hasBasics) {
    return { canGenerate: true, reason: args.reason || args.heuristic.reason };
  }

  // LLM refused because article is sports/politics/etc. — ignore and proceed
  if (isCategoryRefusalReason(args.reason) || (hasBasics && !args.llmCanGenerate)) {
    return {
      canGenerate: true,
      reason: args.heuristic.canGenerate
        ? args.heuristic.reason
        : "Proceeding with editorial image for any news category",
    };
  }

  if (args.heuristic.canGenerate) {
    return { canGenerate: true, reason: args.heuristic.reason };
  }

  // Last resort: still generate from headline/subject if present
  return {
    canGenerate: Boolean(args.who?.trim() || args.heuristic.mainSubject),
    reason: args.reason || args.heuristic.reason,
  };
}

/**
 * GPT Story Understanding Engine + Visual Priority Ranking.
 * Falls back to heuristics when the API key is missing or the call fails.
 */
export async function analyzeArticleStory(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis
): Promise<StoryAnalysisResult> {
  const base = analyzeStoryHeuristic(input, analysis);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi || "").replace(/\s+/g, " ").slice(0, 500);

  const system = `You are an experienced News Art Director for an Indian digital newsroom (News Junction).
You plan featured images for EVERY news category: sports, politics, business, crime, weather, technology, health, world, national, local, AND entertainment.
Return ONLY valid JSON.
Answer:
- who: most important subject (player, politician, company, event, celebrity — whatever fits the story)
- whatHappened: what happened
- whyNews: why this is news
- twoSecondRead: what people must understand in 2 seconds
- bestVisual: which visual tells the story best (sports action / editorial portrait / event scene / etc.)
Also return:
- visualPriority: ranked array (most important first). Sports e.g. ["Jasprit Bumrah","India ODI","England series"]. OTT e.g. ["Samantha","Maa Inti Bangaaram","JioHotstar"]
- Wrong priorities: oversized logos, documents, posters as #1 when a person is the story
- entertainmentStyle: ONLY for entertainment/OTT/movie stories — one of movie_news|ott_release|celebrity_interview|trailer|box_office|music_launch|award_show|tv_series. For sports/politics/business/other set null.
- platform, movieTitle, mainSubject, secondarySubjects
- canGenerate: true for EVERY clear news story regardless of category. Set false ONLY if who AND whatHappened are completely unknowable.
- NEVER set canGenerate false because the article is not entertainment, not a movie, or "does not fit entertainment".
Rules:
- Do NOT invent unrelated objects (paper, contract, laptop, mic, courtroom) unless the article mentions them.
- For sports: athlete / team / match atmosphere first.
- For streaming/OTT stories, actor > movie title > platform > streaming cue.
- Platform logos must never outrank the main person.`;

  const user = `Analyze this article for image art direction.

Headline: ${headline}
Summary: ${summary || "(none)"}
Category: ${input.categoryNameEn} (${input.categoryId})
People: ${analysis.namedPeople.join(", ") || "none"}
Organizations: ${analysis.namedOrganizations.join(", ") || "none"}
Primary subject: ${analysis.primarySubject}
Heuristic platform: ${base.platform || "none"}
Heuristic movie title: ${base.movieTitle || "none"}

Return JSON keys:
who, whatHappened, whyNews, twoSecondRead, bestVisual, visualPriority, entertainmentStyle, platform, movieTitle, mainSubject, secondarySubjects, canGenerate, reason`;

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
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return base;
    const data = await response.json();
    const parsed = parseJsonObject(String(data.choices?.[0]?.message?.content || ""));
    if (!parsed) return base;

    const styleRaw = String(parsed.entertainmentStyle || "").trim();
    const entertainmentStyle =
      styleRaw && styleRaw !== "null"
        ? (styleRaw as EntertainmentStyle)
        : base.entertainmentStyle;

    const who = String(parsed.who || base.understanding.who).slice(0, 160);
    const whatHappened = String(parsed.whatHappened || base.understanding.whatHappened).slice(0, 220);
    const whyNews = String(parsed.whyNews || base.understanding.whyNews).slice(0, 180);
    const twoSecondRead = String(parsed.twoSecondRead || base.understanding.twoSecondRead).slice(0, 180);
    const bestVisual = String(parsed.bestVisual || base.understanding.bestVisual).slice(0, 260);
    const visualPriority = asStringArray(parsed.visualPriority).length
      ? asStringArray(parsed.visualPriority)
      : base.visualPriority;
    const reasonRaw = String(parsed.reason || base.reason).slice(0, 220);
    const resolved = resolveCanGenerate({
      llmCanGenerate: parsed.canGenerate !== false,
      reason: reasonRaw,
      who,
      whatHappened,
      bestVisual,
      heuristic: base,
    });

    // If LLM refused for category reasons, keep its story fields when usable; else prefer heuristic.
    const useHeuristicStory =
      !resolved.canGenerate ||
      isCategoryRefusalReason(reasonRaw) ||
      (!who && Boolean(base.understanding.who));

    return {
      understanding: useHeuristicStory && isCategoryRefusalReason(reasonRaw)
        ? base.understanding
        : { who, whatHappened, whyNews, twoSecondRead, bestVisual },
      visualPriority:
        visualPriority.length && !isCategoryRefusalReason(reasonRaw)
          ? visualPriority
          : base.visualPriority.length
            ? base.visualPriority
            : visualPriority,
      entertainmentStyle: isCategoryRefusalReason(reasonRaw)
        ? base.entertainmentStyle
        : entertainmentStyle,
      platform: String(parsed.platform || base.platform).slice(0, 80),
      movieTitle: String(parsed.movieTitle || base.movieTitle).slice(0, 120),
      mainSubject: String(
        (isCategoryRefusalReason(reasonRaw) ? base.mainSubject : parsed.mainSubject) ||
          who ||
          base.mainSubject
      ).slice(0, 160),
      secondarySubjects: asStringArray(parsed.secondarySubjects).length
        ? asStringArray(parsed.secondarySubjects)
        : base.secondarySubjects,
      isEntertainment: Boolean(
        (isCategoryRefusalReason(reasonRaw) ? base.entertainmentStyle : entertainmentStyle) ||
          base.isEntertainment
      ),
      canGenerate: resolved.canGenerate,
      reason: resolved.reason.slice(0, 220),
    };
  } catch {
    return { ...base, canGenerate: true, reason: base.reason || "Heuristic editorial image" };
  }
}
