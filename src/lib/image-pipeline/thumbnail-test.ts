import "server-only";

import type { NewsVisualStory } from "./visual-story";
import { rewritePromptForStoryComprehension } from "./visual-story";

export type PromptQualityScores = {
  storyClarity: number;
  mainSubjectVisibility: number;
  thumbnailReadability: number;
  composition: number;
  lighting: number;
  backgroundRelevance: number;
  total: number;
};

export type ThumbnailTestResult = {
  ok: boolean;
  knowsWho: boolean;
  knowsWhat: boolean;
  knowsWhere: boolean;
  scores: PromptQualityScores;
  rewrittenPrompt: string;
  reason: string;
};

const MIN_SCORE = 90;

function heuristicScores(prompt: string, story: NewsVisualStory): PromptQualityScores {
  const p = prompt.toLowerCase();
  const hasPerson = Boolean(story.mainSubject) && p.includes(story.mainSubject.toLowerCase().slice(0, 12).toLowerCase());
  const hasEvent = Boolean(story.eventSummary);
  const bansPaper = /paper|contract|document|courtroom|gavel/.test(p) === false || story.imageType === "LEGAL";
  const hasBalance = /60|70%|dominant|portrait/.test(p);
  const entertainmentOk =
    story.imageType !== "ENTERTAINMENT" ||
    (/cinematic|entertainment|poster|streaming|portrait/.test(p) && !/settlement|arrest paperwork/.test(p));

  const storyClarity = hasPerson && hasEvent && entertainmentOk ? 28 : 18;
  const mainSubjectVisibility = hasPerson && hasBalance ? 24 : 16;
  const thumbnailReadability = hasPerson && hasEvent ? 14 : 8;
  const composition = hasBalance ? 14 : 9;
  const lighting = /light|cinematic|bright|warm/.test(p) ? 9 : 6;
  const backgroundRelevance = bansPaper ? 5 : 2;
  const total = storyClarity + mainSubjectVisibility + thumbnailReadability + composition + lighting + backgroundRelevance;
  return {
    storyClarity,
    mainSubjectVisibility,
    thumbnailReadability,
    composition,
    lighting,
    backgroundRelevance,
    total,
  };
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

/**
 * Pre-generation thumbnail comprehension test (Step 9 + score gate Step 12 prompt side).
 * If the prompt would not read at ~250px, rewrite once.
 */
export async function runThumbnailComprehensionTest(
  prompt: string,
  story: NewsVisualStory
): Promise<ThumbnailTestResult> {
  const heuristic = heuristicScores(prompt, story);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const ok = heuristic.total >= MIN_SCORE && story.understandsWithoutReading;
    const rewritten = ok
      ? prompt
      : rewritePromptForStoryComprehension(
          prompt,
          story,
          "Strengthen who/what/where for 250px thumbnail readability; keep main person 60-70% of frame."
        );
    return {
      ok: ok || rewritten !== prompt,
      knowsWho: Boolean(story.mainSubject),
      knowsWhat: Boolean(story.eventSummary),
      knowsWhere: Boolean(story.location || story.organizations[0]),
      scores: heuristic,
      rewrittenPrompt: rewritten,
      reason: ok ? "Heuristic thumbnail test passed" : "Heuristic rewrite applied",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PLANNER_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a news thumbnail QA editor.
If this image prompt were rendered and reduced to 250px wide, would users immediately know WHO, WHAT, and WHERE?
Score dimensions (max): storyClarity 30, mainSubjectVisibility 25, thumbnailReadability 15, composition 15, lighting 10, backgroundRelevance 5.
Minimum total 90.
Return JSON: knowsWho, knowsWhat, knowsWhere, storyClarity, mainSubjectVisibility, thumbnailReadability, composition, lighting, backgroundRelevance, total, pass, rewriteNotes.
If pass is false, rewriteNotes must say how to fix (shorter framing, larger person, smaller logos, remove paperwork).`,
          },
          {
            role: "user",
            content: `Main subject: ${story.mainSubject}
Event: ${story.eventSummary}
Image type: ${story.imageType}
Priority: ${(story.visualPriority || []).join(" > ")}

PROMPT:
${prompt.slice(0, 3500)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!response.ok) {
      const rewritten =
        heuristic.total >= MIN_SCORE
          ? prompt
          : rewritePromptForStoryComprehension(prompt, story, "Improve thumbnail who/what/where clarity.");
      return {
        ok: heuristic.total >= MIN_SCORE,
        knowsWho: true,
        knowsWhat: true,
        knowsWhere: true,
        scores: heuristic,
        rewrittenPrompt: rewritten,
        reason: "Thumbnail API failed — used heuristic",
      };
    }

    const data = await response.json();
    const parsed = parseJsonObject(String(data.choices?.[0]?.message?.content || ""));
    if (!parsed) {
      return {
        ok: heuristic.total >= MIN_SCORE,
        knowsWho: true,
        knowsWhat: true,
        knowsWhere: true,
        scores: heuristic,
        rewrittenPrompt:
          heuristic.total >= MIN_SCORE
            ? prompt
            : rewritePromptForStoryComprehension(prompt, story),
        reason: "Thumbnail parse failed — used heuristic",
      };
    }

    const scores: PromptQualityScores = {
      storyClarity: Number(parsed.storyClarity ?? heuristic.storyClarity),
      mainSubjectVisibility: Number(parsed.mainSubjectVisibility ?? heuristic.mainSubjectVisibility),
      thumbnailReadability: Number(parsed.thumbnailReadability ?? heuristic.thumbnailReadability),
      composition: Number(parsed.composition ?? heuristic.composition),
      lighting: Number(parsed.lighting ?? heuristic.lighting),
      backgroundRelevance: Number(parsed.backgroundRelevance ?? heuristic.backgroundRelevance),
      total: Number(parsed.total ?? heuristic.total),
    };
    const knowsWho = Boolean(parsed.knowsWho);
    const knowsWhat = Boolean(parsed.knowsWhat);
    const knowsWhere = Boolean(parsed.knowsWhere);
    const pass =
      parsed.pass === true ||
      (scores.total >= MIN_SCORE && knowsWho && knowsWhat);

    if (pass) {
      return {
        ok: true,
        knowsWho,
        knowsWhat,
        knowsWhere,
        scores,
        rewrittenPrompt: prompt,
        reason: "Thumbnail test passed",
      };
    }

    const notes = String(parsed.rewriteNotes || "Make main subject larger; shrink logos; remove unrelated objects.");
    return {
      ok: false,
      knowsWho,
      knowsWhat,
      knowsWhere,
      scores,
      rewrittenPrompt: rewritePromptForStoryComprehension(prompt, story, notes),
      reason: notes,
    };
  } catch {
    return {
      ok: heuristic.total >= MIN_SCORE,
      knowsWho: true,
      knowsWhat: true,
      knowsWhere: true,
      scores: heuristic,
      rewrittenPrompt:
        heuristic.total >= MIN_SCORE
          ? prompt
          : rewritePromptForStoryComprehension(prompt, story),
      reason: "Thumbnail test error — used heuristic",
    };
  }
}
