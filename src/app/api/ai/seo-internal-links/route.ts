import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateInternalLinks, logSeoAction } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const suggestions = await generateInternalLinks(articleId);
    await logSeoAction({
      articleId,
      actionType: "seo_internal_links",
      provider: "openai",
      inputPreview: articleId,
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
    const message = error instanceof Error ? error.message : "Internal link generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
