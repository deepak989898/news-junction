import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { processRawNewsItem } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Manually generate an AI article for a single fetched/failed queue item.
 * Uses force:true so admins can generate even when scheduled automation is off.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rawNewsId } = await request.json();
    if (!rawNewsId) {
      return NextResponse.json({ error: "rawNewsId required" }, { status: 400 });
    }

    const result = await processRawNewsItem(String(rawNewsId), { force: true });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Process failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
