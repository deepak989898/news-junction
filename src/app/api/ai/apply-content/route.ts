import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import {
  getAISettings,
  getArticleById,
  applyArticleField,
  applyArticleFields,
  logAIContent,
  calcEstimatedCost,
} from "@/lib/ai-studio/server-db";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { articleId, field, newValue, actionType, saveAsDraft, pendingChangeId } = body;

    if (!articleId || !field || newValue === undefined) {
      return NextResponse.json({ error: "articleId, field, and newValue required" }, { status: 400 });
    }

    const settings = await getAISettings();
    if (settings.requireApprovalForAIChanges) {
      return NextResponse.json(
        { error: "Direct apply disabled. Enable approval workflow or disable requireApprovalForAIChanges." },
        { status: 403 }
      );
    }

    const article = await getArticleById(articleId);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const oldValue = String((article as Record<string, unknown>)[field] || "");
    const extra: Record<string, unknown> = {};

    if (saveAsDraft) {
      extra.status = "draft";
    }

    if (field === "tags") {
      const tags = newValue
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      await applyArticleFields(articleId, { tags, ...extra });
    } else if (field === "contentHi" || field === "contentEn") {
      await applyArticleField(articleId, field, newValue, extra);
    } else {
      await applyArticleField(articleId, field, newValue, extra);
    }

    if (pendingChangeId) {
      await getAdminDb().collection("aiPendingChanges").doc(pendingChangeId).update({
        status: "applied",
        reviewedBy: admin.uid,
        updatedAt: new Date().toISOString(),
      });
    }

    await logAIContent({
      articleId,
      actionType: actionType || "apply",
      provider: settings.provider,
      inputPreview: oldValue.slice(0, 300),
      outputPreview: String(newValue).slice(0, 300),
      usedBy: admin.uid,
      tokensUsed: 0,
      estimatedCost: 0,
      status: "success",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, field, applied: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
