import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/automation/cron-auth";
import { runResearchTrends } from "@/lib/google-trends/research-pipeline";
import { getGoogleTrendsSettings } from "@/lib/google-trends/server-db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getGoogleTrendsSettings();
    if (!settings.enabled) {
      return NextResponse.json({ success: true, skipped: "Google Trends automation disabled" });
    }
    if (settings.autoResearch === false) {
      return NextResponse.json({ success: true, skipped: "Auto-research turned off in settings" });
    }
    const result = await runResearchTrends(Math.max(3, Math.min(settings.maximumTopicsPerRun || 8, 12)));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
