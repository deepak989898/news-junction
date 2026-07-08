import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateSeoMeta, logSeoAction } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const { result, tokensUsed, estimatedCost, provider } = await generateSeoMeta(articleId);
    await logSeoAction({
      articleId,
      actionType: "seo_meta",
      provider,
      inputPreview: articleId,
      outputPreview: JSON.stringify(result).slice(0, 300),
      seoScoreBefore: 0,
      seoScoreAfter: 0,
      usedBy: admin.uid,
      tokensUsed,
      estimatedCost,
      status: "success",
    });
    return NextResponse.json({ result, tokensUsed, estimatedCost });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
