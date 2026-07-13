import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { auditPublishedArticleImages, saveImageAuditQueue } from "@/lib/image-pipeline/audit";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(request.nextUrl.searchParams.get("limit") || 300);
  const saveQueue = request.nextUrl.searchParams.get("saveQueue") === "1";

  const result = await auditPublishedArticleImages(Math.min(limit, 500));
  if (saveQueue) {
    await saveImageAuditQueue(result.items);
  }

  return NextResponse.json(result);
}
