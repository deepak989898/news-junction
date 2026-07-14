import { researchTrendSources } from "./source-research";
import {
  getGoogleTrendsSettings,
  getTrendTopicById,
  getTrendTopicsByStatus,
  logTrendAutomation,
  saveTrendSourceCandidates,
  updateGoogleTrendsSettings,
  updateTrendTopic,
} from "./server-db";
import { calculateTrendPriorityScore } from "./topic-score";
import { verifyTrendSources } from "./verification";
import type { TrendTopic } from "./types";

async function researchOneTrend(trend: TrendTopic, settings: Awaited<ReturnType<typeof getGoogleTrendsSettings>>) {
  await updateTrendTopic(trend.id, { status: "researching", errorMessage: "" });

  const candidates = await researchTrendSources(trend, {
    timeoutMs: settings.sourceResearchTimeoutMs,
  });

  await saveTrendSourceCandidates(trend.id, candidates);

  const { getActiveSources } = await import("@/lib/automation/server-db");
  const activeCount = (await getActiveSources()).length;

  const verification = verifyTrendSources(trend.title, candidates, settings);

  const priorityScore = calculateTrendPriorityScore({
    searchVolume: trend.searchVolume,
    growthPercentage: trend.growthPercentage,
    trendStatus: trend.trendStatus,
    category: trend.category,
    sourceCandidateCount: verification.selectedSources.length,
    duplicateScore: trend.duplicateScore,
    riskLevel: verification.riskLevel,
    fetchedAt: trend.fetchedAt,
  });

  if (verification.verified) {
    await updateTrendTopic(trend.id, {
      status: "verified",
      riskLevel: verification.riskLevel,
      priorityScore,
      verificationNotes: verification.notes,
      errorMessage: null,
    });
    await saveTrendSourceCandidates(trend.id, verification.selectedSources);
    await logTrendAutomation({
      type: "verify",
      trendId: trend.id,
      message: verification.notes,
      category: trend.category,
      status: "verified",
    });
    await logTrendAutomation({
      type: "research",
      trendId: trend.id,
      message: `Active sources=${activeCount}; matching articles=${candidates.length}`,
      category: trend.category,
      status: "verified",
    });
    return { verified: true as const };
  }

  const reason =
    activeCount === 0
      ? "No active Sources configured in Admin → Sources. Add RSS/Official sources first."
      : candidates.length === 0
        ? `Scanned ${activeCount} active source(s) but no matching articles for "${trend.title}". Add category RSS (e.g. business/tech) or re-fetch trends for related news links.`
        : verification.rejectionReason || verification.notes;

  await updateTrendTopic(trend.id, {
    status: "insufficientSources",
    riskLevel: verification.riskLevel,
    priorityScore,
    verificationNotes: reason,
    errorMessage: reason,
  });
  await logTrendAutomation({
    type: "verify",
    trendId: trend.id,
    message: reason,
    category: trend.category,
    status: "insufficientSources",
  });
  return { verified: false as const, reason };
}

export async function runResearchTrends(limit = 20) {
  const settings = await getGoogleTrendsSettings();
  if (!settings.enabled) {
    return { researched: 0, verified: 0, insufficient: 0, message: "Disabled" };
  }

  const fetched = await getTrendTopicsByStatus("fetched", limit);
  const retry = await getTrendTopicsByStatus("insufficientSources", limit);
  const topics = [...fetched, ...retry]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, limit);

  let researched = 0;
  let verified = 0;
  let insufficient = 0;

  for (const trend of topics) {
    try {
      const result = await researchOneTrend(trend, settings);
      researched += 1;
      if (result.verified) verified += 1;
      else insufficient += 1;
    } catch (err) {
      await updateTrendTopic(trend.id, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Research failed",
      });
      await logTrendAutomation({
        type: "error",
        trendId: trend.id,
        message: err instanceof Error ? err.message : "Research failed",
        status: "failed",
      });
    }
  }

  await updateGoogleTrendsSettings({ lastResearchRun: new Date().toISOString() });
  return { researched, verified, insufficient };
}

export async function researchTrendById(trendId: string) {
  const settings = await getGoogleTrendsSettings();
  if (!settings.enabled) throw new Error("Google Trends automation is disabled");

  const trend = await getTrendTopicById(trendId);
  if (!trend) throw new Error("Trend not found");

  const result = await researchOneTrend(trend, settings);
  await updateGoogleTrendsSettings({ lastResearchRun: new Date().toISOString() });
  return { researched: 1, ...result };
}

/** @deprecated Prefer researchTrendById */
export async function researchSingleTrend(trendId: string) {
  return researchTrendById(trendId);
}
