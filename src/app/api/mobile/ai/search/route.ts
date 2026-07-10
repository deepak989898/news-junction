import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { callAI } from "@/lib/ai-studio/ai-client";
import { getAISettings } from "@/lib/ai-studio/server-db";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { query } = await request.json();
    const q = String(query || "").trim();
    if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

    const settings = await getAISettings();
    const suggestionPrompt =
      `Turn this user search into concise search suggestions and topic keywords for a news app.\n` +
      `User query: ${q}\nReturn JSON: {"interpretedQuery":"...","keywords":["..."],"suggestions":["..."]}`;
    const ai = await callAI(settings, "You produce strict JSON only.", suggestionPrompt);
    let interpretedQuery = q;
    let keywords: string[] = [];
    let suggestions: string[] = [];
    try {
      const jsonMatch = ai.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        interpretedQuery = String(parsed.interpretedQuery || q);
        keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map((x: unknown) => String(x)) : [];
        suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map((x: unknown) => String(x)) : [];
      }
    } catch {
      // fallback kept
    }

    const newsSnap = await getAdminDb()
      .collection("news")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(80)
      .get();

    const terms = [interpretedQuery, ...keywords].join(" ").toLowerCase().split(/\s+/).filter(Boolean);
    const related = newsSnap.docs
      .map((d): Record<string, unknown> => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      .filter((n) => {
        const blob = `${String(n["titleEn"] || "")} ${String(n["titleHi"] || "")} ${String(n["summaryEn"] || "")} ${String(n["summaryHi"] || "")} ${
          Array.isArray(n["tags"]) ? (n["tags"] as string[]).join(" ") : ""
        }`.toLowerCase();
        return terms.some((t) => blob.includes(t));
      })
      .slice(0, 20);

    return NextResponse.json({
      interpretedQuery,
      keywords,
      suggestions,
      related,
      tokensUsed: ai.tokensUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
