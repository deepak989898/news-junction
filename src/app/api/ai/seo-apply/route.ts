import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSeoAiSettings, logSeoAction } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { articleId, changeType, payload, bulk = false } = await request.json();
    if (!changeType) return NextResponse.json({ error: "changeType required" }, { status: 400 });

    const settings = await getSeoAiSettings();
    if (bulk && settings.requireApprovalForBulkSeo && admin.role !== "super_admin") {
      return NextResponse.json({ error: "Bulk apply requires super admin approval" }, { status: 403 });
    }

    const canEditorApply = settings.allowEditorSeoApply || admin.role === "super_admin";
    if (admin.role === "editor" && !canEditorApply) {
      return NextResponse.json({ error: "Editors are not allowed to apply SEO changes" }, { status: 403 });
    }

    if (changeType === "article_fields") {
      if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
      await getAdminDb()
        .collection("news")
        .doc(articleId)
        .update({ ...payload, updatedAt: new Date().toISOString() });
    } else if (changeType === "internal_link_status") {
      await getAdminDb()
        .collection("seoInternalLinkSuggestions")
        .doc(payload.id)
        .update({ status: payload.status, updatedAt: new Date().toISOString() });
    } else if (changeType === "topic_status") {
      await getAdminDb()
        .collection("seoTopicSuggestions")
        .doc(payload.id)
        .update({ status: payload.status, updatedAt: new Date().toISOString() });
    } else if (changeType === "apply_internal_links_to_article") {
      if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
      await getAdminDb().collection("news").doc(articleId).update({
        seoInternalLinks: payload.links,
        updatedAt: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({ error: "Unknown changeType" }, { status: 400 });
    }

    await logSeoAction({
      articleId: articleId || "global",
      actionType: `seo_apply_${changeType}`,
      provider: "openai",
      inputPreview: changeType,
      outputPreview: JSON.stringify(payload || {}).slice(0, 300),
      seoScoreBefore: 0,
      seoScoreAfter: 0,
      usedBy: admin.uid,
      tokensUsed: 0,
      estimatedCost: 0,
      status: "success",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEO apply failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
