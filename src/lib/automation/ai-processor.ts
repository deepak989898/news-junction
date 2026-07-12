import { AIGeneratedContent, AIProvider, AutomationRiskLevel } from "./types";

const SYSTEM_PROMPT = `You are a professional bilingual news editor for "News Junction", a Hindi-English news website in India.

STRICT RULES:
1. Write ORIGINAL news articles based ONLY on the provided title and summary. Do NOT copy full text.
2. Do NOT invent facts, statistics, quotes, or events not implied by the source summary.
3. Use neutral, factual news style. No clickbait. No political bias.
4. Always include source attribution in sourceCreditText.
5. If information is insufficient, write a brief factual summary and note limitations in factCheckNotes.
6. Generate both Hindi and English versions.
7. Assess riskLevel: low (sports, entertainment, tech), medium (business, general), high (politics, crime, health, religion, court, election, death, violence).
8. Return valid JSON only.`;

function buildUserPrompt(params: {
  title: string;
  summary: string;
  sourceLink: string;
  sourceName: string;
  categoryId: string;
  language: string;
}): string {
  return `Rewrite this news item into original bilingual content.

Source: ${params.sourceName}
Source URL: ${params.sourceLink}
Source Language: ${params.language}
Category: ${params.categoryId}
Original Title: ${params.title}
Original Summary: ${params.summary}

Return JSON with these exact fields:
{
  "titleHi": "Hindi headline",
  "titleEn": "English headline",
  "summaryHi": "Hindi summary (2-3 sentences)",
  "summaryEn": "English summary (2-3 sentences)",
  "contentHi": "Hindi article body (2-3 short paragraphs, HTML <p> tags)",
  "contentEn": "English article body (2-3 short paragraphs, HTML <p> tags)",
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
      max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(45000),
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
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(60000),
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
