import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, getCronAuthFailureHint } from "@/lib/automation/cron-auth";
import { runAutoPublishCycle } from "@/lib/automation/fetch-pipeline";

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
    const force = request.nextUrl.searchParams.get("force") === "true";
    const batchSize = Number(request.nextUrl.searchParams.get("batchSize") || "1");
    const result = await runAutoPublishCycle({
      force,
      batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 1,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto publish cycle failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
