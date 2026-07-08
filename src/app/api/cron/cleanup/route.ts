import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/automation/cron-auth";
import { cleanupOldRawNews, updateAutomationSettings, logAutomation } from "@/lib/automation/server-db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await cleanupOldRawNews(30);
    await updateAutomationSettings({ lastCleanupRun: new Date().toISOString() });
    await logAutomation({
      type: "process",
      message: `Cleanup: removed ${deleted} old rawNews items`,
      status: "success",
    });
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
