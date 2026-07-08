import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { applyArticleField } from "@/lib/ai-studio/server-db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  try {
    const { pendingChangeId, action } = await request.json();
    if (!pendingChangeId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "pendingChangeId and action required" }, { status: 400 });
    }

    const ref = getAdminDb().collection("aiPendingChanges").doc(pendingChangeId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Pending change not found" }, { status: 404 });
    }

    const data = doc.data()!;
    const now = new Date().toISOString();

    if (action === "reject") {
      await ref.update({ status: "rejected", reviewedBy: admin.uid, updatedAt: now });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    await ref.update({ status: "approved", reviewedBy: admin.uid, updatedAt: now });

    if (data.field === "tags") {
      const tags = String(data.newValue)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await getAdminDb()
        .collection("news")
        .doc(data.articleId)
        .update({ tags, updatedAt: now });
    } else {
      await applyArticleField(data.articleId, data.field, data.newValue);
    }

    await ref.update({ status: "applied", updatedAt: now });
    return NextResponse.json({ success: true, status: "applied" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
