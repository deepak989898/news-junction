import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { regenerateArticleImage } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { newsId, titleEn, titleHi, summaryEn, categoryId } = body;
    if (!newsId || typeof newsId !== "string") {
      return NextResponse.json({ error: "newsId is required" }, { status: 400 });
    }

    const result = await regenerateArticleImage(newsId, {
      titleEn: typeof titleEn === "string" ? titleEn : undefined,
      titleHi: typeof titleHi === "string" ? titleHi : undefined,
      summaryEn: typeof summaryEn === "string" ? summaryEn : undefined,
      categoryId: typeof categoryId === "string" ? categoryId : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
