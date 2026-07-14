import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { auditPublishedArticleImages, saveImageAuditQueue } from "@/lib/image-pipeline/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 200);
    const saveQueue = request.nextUrl.searchParams.get("saveQueue") === "1";

    const result = await auditPublishedArticleImages(Math.min(Math.max(limit, 1), 300));
    if (saveQueue) {
      try {
        await saveImageAuditQueue(result.items);
      } catch (queueError) {
        console.error("imageAuditQueue save failed:", queueError);
        // Non-fatal — still return audit results.
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image audit failed";
    console.error("image audit failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
