import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { applyGrowthRecommendation } from "@/lib/ai-analytics/apply-recommendation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const recommendationType = String(body.recommendationType || "");
    if (!recommendationType) {
      return NextResponse.json({ error: "recommendationType required" }, { status: 400 });
    }

    const details = await applyGrowthRecommendation({
      recommendationId: body.recommendationId ? String(body.recommendationId) : undefined,
      recommendationType,
      articleId: body.articleId ? String(body.articleId) : undefined,
      title: body.title ? String(body.title) : undefined,
      usedBy: admin.uid,
    });

    return NextResponse.json({ success: true, details });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply recommendation failed";
    console.error("apply recommendation failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
