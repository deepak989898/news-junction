import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifyCronRequest, getCronAuthFailureHint } from "@/lib/automation/cron-auth";
import { getGoogleTrendsSettings, updateGoogleTrendsSettings } from "@/lib/google-trends/server-db";
import {
  computeDueSlot,
  hasPendingTrendWork,
  runGoogleTrendsFullCycle,
} from "@/lib/google-trends/cycle-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Single self-scheduling entry point for external cron services (e.g. cron-job.org).
 *
 * Ping this URL every few minutes. It responds instantly (so the cron never times out)
 * and runs the Fetch → Research → Generate → Publish cycle in the background via after().
 *
 * The admin controls WHEN a fresh fetch happens via the schedule times in
 * Google Trends → Settings. Between scheduled times, pings simply drain any pending
 * (already fetched/verified) trends so everything eventually publishes.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized", hint: getCronAuthFailureHint() },
      { status: 401 }
    );
  }

  try {
    const settings = await getGoogleTrendsSettings();
    if (!settings.enabled) {
      return NextResponse.json({ success: true, skipped: "Google Trends automation disabled" });
    }

    const force = request.nextUrl.searchParams.get("force") === "true";
    const now = new Date();

    // Background lock: skip if another cycle is still running (auto-expires if stale).
    const lockAt = settings.cycleRunningAt ? Date.parse(settings.cycleRunningAt) : 0;
    const lockActive = Boolean(lockAt) && Date.now() - lockAt < maxDuration * 1000 + 30_000;
    if (lockActive && !force) {
      return NextResponse.json({ success: true, skipped: "Cycle already running" });
    }

    const dueSlot = force ? null : computeDueSlot(settings, now);
    const doFetch = force || Boolean(dueSlot);

    // Nothing scheduled right now — only continue if there is queued work to drain.
    if (!doFetch) {
      const pending = await hasPendingTrendWork();
      if (!pending) {
        return NextResponse.json({
          success: true,
          skipped: "Not a scheduled time and nothing pending",
        });
      }
    }

    // Acquire the lock and (for a due slot) claim it so parallel pings don't repeat it.
    await updateGoogleTrendsSettings({
      cycleRunningAt: new Date().toISOString(),
      ...(dueSlot ? { lastScheduledSlot: dueSlot } : {}),
    });

    const budgetMs = (maxDuration - 15) * 1000;

    after(async () => {
      try {
        await runGoogleTrendsFullCycle({ doFetch, budgetMs });
      } catch {
        // runGoogleTrendsFullCycle logs its own failures.
      } finally {
        await updateGoogleTrendsSettings({ cycleRunningAt: null });
      }
    });

    return NextResponse.json({
      success: true,
      started: true,
      doFetch,
      slot: dueSlot,
      message: doFetch
        ? "Scheduled cycle started (fetch + research + generate + publish)"
        : "Draining pending trends (research + generate + publish)",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cycle failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
