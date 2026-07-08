import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { logSeoAction, runSeoAudit } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const audit = await runSeoAudit(articleId);
    await logSeoAction({
      articleId,
      actionType: "seo_audit",
      provider: "openai",
      inputPreview: articleId,
      outputPreview: JSON.stringify(audit).slice(0, 300),
      seoScoreBefore: audit.seoScore,
      seoScoreAfter: audit.seoScore,
      usedBy: admin.uid,
      tokensUsed: 0,
      estimatedCost: 0,
      status: "success",
    });
    return NextResponse.json(audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
