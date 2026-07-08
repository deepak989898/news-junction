import { AISettings } from "./types";

const OPENAI_INPUT_COST = 0.15 / 1_000_000;
const OPENAI_OUTPUT_COST = 0.6 / 1_000_000;
const GEMINI_INPUT_COST = 0.075 / 1_000_000;
const GEMINI_OUTPUT_COST = 0.3 / 1_000_000;

export function estimateCost(provider: AISettings["provider"], tokensUsed: number): number {
  const inputRatio = 0.6;
  const outputRatio = 0.4;
  if (provider === "gemini") {
    return tokensUsed * inputRatio * GEMINI_INPUT_COST + tokensUsed * outputRatio * GEMINI_OUTPUT_COST;
  }
  return tokensUsed * inputRatio * OPENAI_INPUT_COST + tokensUsed * outputRatio * OPENAI_OUTPUT_COST;
}

export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface AICallResult {
  text: string;
  tokensUsed: number;
}

export async function callAI(
  settings: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<AICallResult> {
  if (!settings.aiEnabled) {
    throw new Error("AI is disabled in settings");
  }

  if (settings.provider === "gemini") {
    return callGemini(settings, systemPrompt, userPrompt);
  }
  return callOpenAI(settings, systemPrompt, userPrompt);
}

async function callOpenAI(
  settings: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<AICallResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.openaiModel || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokensUsed = data.usage?.total_tokens || estimateTokensFromText(systemPrompt + userPrompt + text);
  return { text, tokensUsed };
}

async function callGemini(
  settings: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<AICallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = settings.geminiModel || "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const tokensUsed =
    data.usageMetadata?.totalTokenCount || estimateTokensFromText(systemPrompt + userPrompt + text);
  return { text, tokensUsed };
}
