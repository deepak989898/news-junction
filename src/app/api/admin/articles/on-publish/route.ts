import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { enrichArticleOnPublish } from "@/lib/article-enrichment/on-publish";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const articleId = String(body.articleId || "");
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

    const result = await enrichArticleOnPublish(articleId, {
      sendPush: body.sendPush !== false,
      queueSocial: body.queueSocial !== false,
      forceFaq: Boolean(body.forceFaq),
      forceLinks: Boolean(body.forceLinks),
      forceMeta: Boolean(body.forceMeta),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "On-publish enrichment failed";
    console.error("on-publish enrichment failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
