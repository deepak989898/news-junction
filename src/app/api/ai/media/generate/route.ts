import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateMediaAsset, generateOgImageForArticle } from "@/lib/ai-media/service";
import { MediaImageType } from "@/lib/ai-media/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const {
      articleId,
      categoryId,
      imageType = "article_featured",
      provider,
      style,
      language = "both",
      customPrompt,
      alternatives = 1,
    } = body;
    if (!imageType) return NextResponse.json({ error: "imageType required" }, { status: 400 });

    const validType = imageType as MediaImageType;
    let assets;
    if (validType === "open_graph" && articleId) {
      assets = await generateOgImageForArticle(articleId, admin.uid);
    } else {
      assets = await generateMediaAsset({
        articleId,
        categoryId,
        imageType: validType,
        provider,
        style,
        language,
        customPrompt,
        createdBy: admin.uid,
        makeAlternatives: Number(alternatives || 1),
      });
    }
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
