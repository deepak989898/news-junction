import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateContentGapSuggestions, logSeoAction } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const suggestions = await generateContentGapSuggestions();
    await logSeoAction({
      articleId: "global",
      actionType: "seo_content_gap",
      provider: "openai",
      inputPreview: "content-gap",
      outputPreview: JSON.stringify(suggestions).slice(0, 300),
      seoScoreBefore: 0,
      seoScoreAfter: 0,
      usedBy: admin.uid,
      tokensUsed: 0,
      estimatedCost: 0,
      status: "success",
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content gap analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
