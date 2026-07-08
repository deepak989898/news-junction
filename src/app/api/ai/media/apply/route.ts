import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { applyMediaAssetToArticle } from "@/lib/ai-media/service";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { imageId, articleId, action = "apply" } = await request.json();
    if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });
    if (action === "approve" || action === "reject") {
      await getAdminDb().collection("mediaAssets").doc(imageId).update({
        status: action === "approve" ? "approved" : "rejected",
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, status: action === "approve" ? "approved" : "rejected" });
    }
    if (!articleId) return NextResponse.json({ error: "articleId required for apply" }, { status: 400 });
    await applyMediaAssetToArticle(imageId, articleId, admin.uid);
    return NextResponse.json({ success: true, status: "applied" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply media asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
