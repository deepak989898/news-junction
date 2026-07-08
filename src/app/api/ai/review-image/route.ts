import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { runEditorialReview } from "@/lib/ai-editorial/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, force = true } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const result = await runEditorialReview({
      articleId,
      reviewType: "image",
      createdBy: admin.uid,
      force: Boolean(force),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
