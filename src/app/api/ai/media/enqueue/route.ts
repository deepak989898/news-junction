import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { enqueueMediaGeneration } from "@/lib/ai-media/service";
import { MediaImageType } from "@/lib/ai-media/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const {
      articleIds = [],
      categoryId,
      imageType = "article_featured",
      provider = "openai-images",
      style = "editorial",
      language = "both",
      customPrompt,
    } = body;
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: "articleIds required for enqueue" }, { status: 400 });
    }
    const capped = articleIds.slice(0, 100);
    const items = capped.map((articleId: string) => ({
      articleId,
      categoryId,
      imageType: imageType as MediaImageType,
      provider,
      style,
      language,
      customPrompt,
      createdBy: admin.uid,
    }));
    const result = await enqueueMediaGeneration(items);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue enqueue failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
