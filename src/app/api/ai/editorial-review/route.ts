import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { enqueueEditorialReview, processEditorialQueue, runEditorialReview } from "@/lib/ai-editorial/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { articleId, reviewType = "full", async: asyncMode = false, force = false } = body;
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

    // Queue mode when UI requests async; otherwise run sync so editors get immediate scores
    if (asyncMode === true) {
      const queued = await enqueueEditorialReview({
        articleId,
        reviewType,
        createdBy: admin.uid,
      });
      processEditorialQueue(5).catch(() => {});
      return NextResponse.json({ queued: true, queueItem: queued });
    }

    const result = await runEditorialReview({
      articleId,
      reviewType,
      createdBy: admin.uid,
      force: Boolean(force),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Editorial review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
