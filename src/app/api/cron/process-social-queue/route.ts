import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, getCronAuthFailureHint } from "@/lib/automation/cron-auth";
import { getSocialSettings, processSocialQueue } from "@/lib/ai-social/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized", hint: getCronAuthFailureHint() },
      { status: 401 }
    );
  }

  try {
    const settings = await getSocialSettings();
    if (!settings.autoPublishEnabled) {
      return NextResponse.json({
        success: true,
        skippedCron: true,
        reason: "autoPublishEnabled is false",
        autoPublishEnabled: false,
      });
    }
    const result = await processSocialQueue(20, { force: false });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social queue processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
