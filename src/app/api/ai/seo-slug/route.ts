import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateSeoSlugs, logSeoAction } from "@/lib/ai-seo/service";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function markUnique(slug: string): Promise<string> {
  const snap = await getAdminDb().collection("news").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return slug;
  return `${slug}-${Date.now().toString().slice(-4)}`;
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const { result, tokensUsed, estimatedCost, provider } = await generateSeoSlugs(articleId);
    const unique = {
      englishSlug: await markUnique(result.englishSlug),
      hindiTransliterationSlug: await markUnique(result.hindiTransliterationSlug),
      shortSeoSlug: await markUnique(result.shortSeoSlug),
      categoryBasedSlug: await markUnique(result.categoryBasedSlug),
    };
    await logSeoAction({
      articleId,
      actionType: "seo_slug",
      provider,
      inputPreview: articleId,
      outputPreview: JSON.stringify(unique).slice(0, 300),
      seoScoreBefore: 0,
      seoScoreAfter: 0,
      usedBy: admin.uid,
      tokensUsed,
      estimatedCost,
      status: "success",
    });
    return NextResponse.json({ result: unique, tokensUsed, estimatedCost });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Slug generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
