import { runFetchGoogleTrends } from "./fetch-pipeline";
import { researchTrendById } from "./research-pipeline";
import { processTrendById } from "./process-pipeline";
import { publishTrendArticle } from "./publish-pipeline";
import {
  countTrendArticlesPublishedToday,
  getGoogleTrendsSettings,
  getTrendTopicsByStatus,
  logTrendAutomation,
  updateGoogleTrendsSettings,
} from "./server-db";
import type { GoogleTrendsSettings } from "./types";

export interface TrendCycleSummary {
  fetched: number;
  verified: number;
  generated: number;
  published: number;
  at: string;
}

/** True when the value looks like a valid "HH:MM" 24-hour time string. */
export function isValidScheduleTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

/** Normalize a list of "HH:MM" strings: trim, keep valid, unique, sorted. */
export function normalizeScheduleTimes(times: unknown): string[] {
  if (!Array.isArray(times)) return [];
  const cleaned = times
    .map((t) => String(t).trim())
    .filter((t) => isValidScheduleTime(t));
  return Array.from(new Set(cleaned)).sort();
}

function slotToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/** Get {dateKey:"YYYY-MM-DD", minutes, hhmm} for `now` in a given IANA timezone. */
export function getZonedParts(now: Date, timeZone: string): {
  dateKey: string;
  minutes: number;
  hhmm: string;
} {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: parseInt(hour, 10) * 60 + parseInt(minute, 10),
    hhmm: `${hour}:${minute}`,
  };
}

/** How late (in minutes) a scheduled slot can still fire if an earlier ping was missed. */
const SCHEDULE_GRACE_MINUTES = 120;

/**
 * Returns the dedup key ("YYYY-MM-DDTHH:MM") of a schedule slot that is due now
 * and has not run yet, or null if nothing is due.
 */
export function computeDueSlot(settings: GoogleTrendsSettings, now: Date): string | null {
  if (settings.scheduleEnabled === false) return null;
  const times = normalizeScheduleTimes(settings.scheduleTimes);
  if (times.length === 0) return null;

  const tz = settings.scheduleTimezone || "Asia/Kolkata";
  const { dateKey, minutes } = getZonedParts(now, tz);

  let bestSlot: string | null = null;
  let bestMinutes = -1;
  for (const t of times) {
    const slotMinutes = slotToMinutes(t);
    const elapsed = minutes - slotMinutes;
    if (elapsed >= 0 && elapsed <= SCHEDULE_GRACE_MINUTES && slotMinutes > bestMinutes) {
      bestMinutes = slotMinutes;
      bestSlot = t;
    }
  }

  if (!bestSlot) return null;
  const slotKey = `${dateKey}T${bestSlot}`;
  if (settings.lastScheduledSlot === slotKey) return null;
  return slotKey;
}

/** Is there any queued trend work (fetched/verified/processing) worth draining? */
export async function hasPendingTrendWork(): Promise<boolean> {
  const [fetched, verified, processing] = await Promise.all([
    getTrendTopicsByStatus("fetched", 1),
    getTrendTopicsByStatus("verified", 1),
    getTrendTopicsByStatus("processing", 1),
  ]);
  return fetched.length > 0 || verified.length > 0 || processing.length > 0;
}

/**
 * Runs one time-bounded pass of the Google Trends pipeline:
 *   (optional) Fetch → Research fetched → Generate + auto-publish verified → Publish leftovers.
 * Designed to be called repeatedly (e.g. every few minutes by an external cron) so the
 * queue drains without exceeding a single serverless invocation's time budget.
 */
export async function runGoogleTrendsFullCycle(params: {
  doFetch: boolean;
  budgetMs: number;
}): Promise<TrendCycleSummary> {
  const started = Date.now();
  const deadline = started + Math.max(10_000, params.budgetMs);
  const settings = await getGoogleTrendsSettings();

  const summary: TrendCycleSummary = {
    fetched: 0,
    verified: 0,
    generated: 0,
    published: 0,
    at: new Date().toISOString(),
  };

  const now = () => Date.now();

  // 1) Fetch new trends (only when a scheduled slot is due).
  if (params.doFetch) {
    try {
      const result = await runFetchGoogleTrends();
      summary.fetched = result.fetched || 0;
    } catch (err) {
      await logTrendAutomation({
        type: "error",
        message: `Cycle fetch failed: ${err instanceof Error ? err.message : "unknown"}`,
        status: "failed",
      });
    }
  }

  // 2) Research fetched trends (verify sources). Only "fetched" so we never loop on
  //    permanently-unverifiable topics.
  if (settings.autoResearch !== false && now() < deadline) {
    const fetched = await getTrendTopicsByStatus("fetched", 60);
    for (const trend of fetched) {
      if (now() >= deadline) break;
      try {
        const result = await researchTrendById(trend.id);
        if (result.verified) summary.verified += 1;
      } catch {
        // researchTrendById records its own failure; keep going.
      }
    }
  }

  // 3) Generate articles + images for verified trends, honoring daily/category caps.
  if (settings.autoGenerate !== false && now() < deadline) {
    const counts = await countTrendArticlesPublishedToday();
    const verified = await getTrendTopicsByStatus("verified", 60);
    for (const trend of verified) {
      if (now() >= deadline) break;
      if (counts.total >= settings.maximumArticlesPerDay) break;
      const catCount = counts.byCategory[trend.mappedCategoryId] || 0;
      if (catCount >= settings.maximumArticlesPerCategoryPerDay) continue;

      try {
        const result = await processTrendById(trend.id);
        summary.generated += 1;
        counts.total += 1;
        counts.byCategory[trend.mappedCategoryId] = catCount + 1;
        if (result.status === "published") summary.published += 1;
      } catch {
        // processTrendById marks the trend failed on hard errors; keep going.
      }
    }
  }

  // 4) Publish any leftover "processing" trends (generated earlier but not yet live).
  if (now() < deadline) {
    const processing = await getTrendTopicsByStatus("processing", 60);
    for (const trend of processing) {
      if (now() >= deadline) break;
      if (trend.riskLevel === "high" && settings.highRiskAlwaysApproval) continue;
      try {
        await publishTrendArticle(trend.id);
        summary.published += 1;
      } catch {
        // publishTrendArticle logs its own failure; keep going.
      }
    }
  }

  const stamp = new Date().toISOString();
  summary.at = stamp;
  await updateGoogleTrendsSettings({
    lastCycleRun: stamp,
    lastResearchRun: stamp,
    lastProcessRun: stamp,
    lastPublishRun: stamp,
    ...(params.doFetch ? { lastFetchRun: stamp } : {}),
    lastCycleSummary: summary,
  });

  return summary;
}
