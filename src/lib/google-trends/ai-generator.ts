import { AIGeneratedContent, AIProvider } from "@/lib/automation/types";
import { VerifiedTrendContext } from "./types";
import { TrendTopic } from "./types";

const TREND_SYSTEM_PROMPT = `You are a professional bilingual news editor for "News Junction", India.

CRITICAL RULES:
1. Write ONLY from the VERIFIED SOURCE FACTS provided below.
2. The Google Trends keyword is a discovery signal — NOT a source. Do NOT invent the story from the keyword alone.
3. Do NOT invent quotes, numbers, dates, names, or events not supported by verified sources.
4. Neutral journalism. No clickbait. No political bias.
5. Include source attribution listing all verified sources.
6. Return valid JSON only.
7. Assess riskLevel honestly for politics, crime, health, religion, death, etc.`;

function buildTrendArticlePrompt(
  trend: TrendTopic,
  context: VerifiedTrendContext
): string {
  const sourceList = context.sources
    .map((s) => `- ${s.sourceName}: ${s.title} (${s.sourceUrl})\n  Summary: ${s.summary}`)
    .join("\n");

  return `Trend discovery keyword (NOT a source): ${trend.title}
Mapped category: ${trend.mappedCategoryId}

VERIFIED SOURCE FACTS ONLY:
${context.centralFacts}

Verified sources:
${sourceList}

Shared entities/facts: ${context.agreedEntities.join(", ")}

Return JSON:
{
  "titleHi": "Hindi headline",
  "titleEn": "English headline",
  "summaryHi": "2-3 sentence Hindi summary",
  "summaryEn": "2-3 sentence English summary",
  "contentHi": "Hindi article HTML with <p> tags, 3-4 paragraphs",
  "contentEn": "English article HTML with <p> tags, 3-4 paragraphs",
  "keyPointsHi": ["point1", "point2"],
  "keyPointsEn": ["point1", "point2"],
  "tagsHi": ["tag1", "tag2"],
  "tagsEn": ["tag1", "tag2"],
  "tags": ["tag1", "tag2"],
  "imageAltHi": "Hindi image alt",
  "imageAltEn": "English image alt",
  "seoTitleHi": "Hindi SEO title",
  "seoTitleEn": "English SEO title",
  "seoDescriptionHi": "Hindi meta description",
  "seoDescriptionEn": "English meta description",
  "primaryKeyword": "main keyword",
  "secondaryKeywords": ["kw1", "kw2"],
  "faqHi": [{"question": "...", "answer": "..."}],
  "faqEn": [{"question": "...", "answer": "..."}],
  "relatedArticleSuggestions": ["topic1"],
  "internalLinkSuggestions": ["anchor text suggestion"],
  "riskLevel": "low|medium|high",
  "factCheckNotes": "consistency notes",
  "sourceCreditText": "Sources: ..."
}`;
}

function parseTrendAIResponse(text: string): (AIGeneratedContent & Record<string, unknown>) | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.titleHi || !parsed.titleEn || !parsed.contentHi || !parsed.contentEn) return null;

    return {
      titleHi: parsed.titleHi,
      titleEn: parsed.titleEn,
      summaryHi: parsed.summaryHi || "",
      summaryEn: parsed.summaryEn || "",
      contentHi: parsed.contentHi,
      contentEn: parsed.contentEn,
      tags: Array.isArray(parsed.tags) ? parsed.tags : parsed.tagsEn || [],
      imageAltHi: parsed.imageAltHi || parsed.titleHi,
      imageAltEn: parsed.imageAltEn || parsed.titleEn,
      seoTitleHi: parsed.seoTitleHi || parsed.titleHi,
      seoTitleEn: parsed.seoTitleEn || parsed.titleEn,
      seoDescriptionHi: parsed.seoDescriptionHi || parsed.summaryHi || "",
      seoDescriptionEn: parsed.seoDescriptionEn || parsed.summaryEn || "",
      riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
      factCheckNotes: parsed.factCheckNotes || "",
      suggestedCategory: parsed.suggestedCategory || "",
      sourceCreditText: parsed.sourceCreditText || "",
      keyPointsHi: parsed.keyPointsHi || [],
      keyPointsEn: parsed.keyPointsEn || [],
      tagsHi: parsed.tagsHi || [],
      tagsEn: parsed.tagsEn || [],
      primaryKeyword: parsed.primaryKeyword || "",
      secondaryKeywords: parsed.secondaryKeywords || [],
      faqHi: parsed.faqHi || [],
      faqEn: parsed.faqEn || [],
      relatedArticleSuggestions: parsed.relatedArticleSuggestions || [],
      internalLinkSuggestions: parsed.internalLinkSuggestions || [],
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
        { role: "system", content: TREND_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function generateTrendArticleFromVerifiedSources(
  trend: TrendTopic,
  context: VerifiedTrendContext,
  _provider: AIProvider = "openai"
): Promise<AIGeneratedContent & Record<string, unknown>> {
  const prompt = buildTrendArticlePrompt(trend, context);
  const raw = await callOpenAI(prompt);
  const parsed = parseTrendAIResponse(raw);
  if (!parsed) throw new Error("Failed to parse trend article AI response");
  return parsed;
}
