import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/automation/cron-auth";
import { runProcessNews } from "@/lib/automation/fetch-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Skip AI images during cron process to stay under Vercel time limits (regenerate later).
    // Process a time-bounded batch so a single daily run clears many fetched items.
    const result = await runProcessNews(40, {
      preferHostedImage: true,
      skipOpenAiImage: true,
      maxMs: 110_000,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Process failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
