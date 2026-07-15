import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { processRawNewsItem } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate (or regenerate) an article for a single queue item and publish it immediately.
 * Bypasses risk gates, source flag, daily caps, weak-image holds and the duplicate guard,
 * because this is an explicit admin action. Called one item at a time by the background
 * bulk runner so the UI stays responsive.
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

    const result = await processRawNewsItem(String(rawNewsId), {
      forcePublish: true,
      skipDuplicateCheck: true,
      preferHostedImage: true,
      skipOpenAiImage: true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generate & publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
