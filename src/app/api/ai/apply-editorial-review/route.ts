import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { applyEditorialReview } from "@/lib/ai-editorial/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, reviewId, action, payload } = await request.json();
    if (!articleId || !action) {
      return NextResponse.json({ error: "articleId and action required" }, { status: 400 });
    }
    if (!["approve", "reject", "apply_suggestions"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const result = await applyEditorialReview({
      articleId,
      reviewId,
      action,
      payload,
      createdBy: admin.uid,
      role: admin.role,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply editorial review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
