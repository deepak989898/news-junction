import { AIGeneratedContent, AIProvider, AutomationRiskLevel } from "./types";

const SYSTEM_PROMPT = `You are a professional bilingual news editor for "News Junction", a Hindi-English news website in India.

STRICT RULES:
1. Rewrite into ORIGINAL News Junction articles. Never copy the source headline or body verbatim — change wording, structure, and angle while keeping the same verified facts.
2. Do NOT invent facts, statistics, quotes, names, or events not implied by the source summary.
3. Use neutral, factual news style. No clickbait. No political bias.
4. Always include source attribution in sourceCreditText.
5. If information is insufficient, expand carefully into context and what is known / not known — never invent.
6. Generate both Hindi and English versions with different phrasing (not a literal word-swap).
7. Assess riskLevel: low (sports, entertainment, tech), medium (business, general), high (politics, crime, health, religion, court, election, death, violence).
8. LENGTH: Write substantial articles that keep readers engaged. Summary = short briefing. Body = full report with multiple paragraphs.
9. Return valid JSON only.`;

function buildUserPrompt(params: {
  title: string;
  summary: string;
  sourceLink: string;
  sourceName: string;
  categoryId: string;
  language: string;
}): string {
  return `Create an original News Junction article inspired by this external-source item.
Other sites may cover the same event — your job is to republish OUR rewritten version (not a duplicate copy).

Source: ${params.sourceName}
Source URL: ${params.sourceLink}
Source Language: ${params.language}
Category: ${params.categoryId}
Original Title: ${params.title}
Original Summary: ${params.summary}

Rewrite requirements:
- New title/summary/body (Hindi + English) with fresh wording
- Keep only facts supported by the source summary
- Mention attribution; do not paste the source article
- SHORT briefing (summary): 3–5 clear sentences (~80–140 words) — enough for a quick reader
- FULL story (content): 6–9 HTML <p> paragraphs (~450–750 words). Structure:
  1) Lead / what happened
  2) Why it matters / context
  3) Key details and background
  4) What people / institutions said or did (only if in source)
  5) Impact / next steps / what to watch
  6) Closing factual wrap-up with attribution
- Do NOT write only 2–3 tiny paragraphs. Prefer depth and clarity over brevity.

Return JSON with these exact fields:
{
  "titleHi": "Hindi headline",
  "titleEn": "English headline",
  "summaryHi": "Hindi SHORT briefing (3-5 sentences)",
  "summaryEn": "English SHORT briefing (3-5 sentences)",
  "contentHi": "Hindi FULL story body (6-9 paragraphs, HTML <p> tags)",
  "contentEn": "English FULL story body (6-9 paragraphs, HTML <p> tags)",
  "tags": ["tag1", "tag2"],
  "imageAltHi": "Hindi alt text describing what is VISUALLY shown in the image (not just the headline)",
  "imageAltEn": "English alt text describing what is VISUALLY shown in the image (scene, place, event — so a blind user understands the news topic from the image)",
  "seoTitleHi": "Hindi SEO title",
  "seoTitleEn": "English SEO title",
  "seoDescriptionHi": "Hindi meta description",
  "seoDescriptionEn": "English meta description",
  "riskLevel": "low|medium|high",
  "factCheckNotes": "Notes about source reliability and any limitations",
  "suggestedCategory": "category slug",
  "sourceCreditText": "Attribution text with source name"
}`;
}

function parseAIResponse(text: string): AIGeneratedContent | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const risk = ["low", "medium", "high"].includes(parsed.riskLevel)
      ? (parsed.riskLevel as AutomationRiskLevel)
      : "medium";

    if (!parsed.titleHi || !parsed.titleEn || !parsed.contentHi || !parsed.contentEn) {
      return null;
    }

    return {
      titleHi: parsed.titleHi,
      titleEn: parsed.titleEn,
      summaryHi: parsed.summaryHi || "",
      summaryEn: parsed.summaryEn || "",
      contentHi: parsed.contentHi,
      contentEn: parsed.contentEn,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      imageAltHi: parsed.imageAltHi || parsed.titleHi,
      imageAltEn: parsed.imageAltEn || parsed.titleEn,
      seoTitleHi: parsed.seoTitleHi || parsed.titleHi,
      seoTitleEn: parsed.seoTitleEn || parsed.titleEn,
      seoDescriptionHi: parsed.seoDescriptionHi || parsed.summaryHi || "",
      seoDescriptionEn: parsed.seoDescriptionEn || parsed.summaryEn || "",
      riskLevel: risk,
      factCheckNotes: parsed.factCheckNotes || "",
      suggestedCategory: parsed.suggestedCategory || "",
      sourceCreditText: parsed.sourceCreditText || "",
    };
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function generateArticleContent(
  provider: AIProvider,
  params: {
    title: string;
    summary: string;
    sourceLink: string;
    sourceName: string;
    categoryId: string;
    language: string;
  }
): Promise<AIGeneratedContent> {
  const prompt = buildUserPrompt(params);
  const raw =
    provider === "gemini" ? await callGemini(prompt) : await callOpenAI(prompt);
  const result = parseAIResponse(raw);
  if (!result) throw new Error("AI returned incomplete or invalid content");
  return result;
}
