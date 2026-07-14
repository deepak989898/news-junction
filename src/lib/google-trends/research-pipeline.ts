import { researchTrendSources } from "./source-research";
import {
  getGoogleTrendsSettings,
  getTrendTopicsByStatus,
  logTrendAutomation,
  saveTrendSourceCandidates,
  updateGoogleTrendsSettings,
  updateTrendTopic,
} from "./server-db";
import { calculateTrendPriorityScore } from "./topic-score";
import { verifyTrendSources } from "./verification";

export async function runResearchTrends(limit = 5) {
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
      await updateTrendTopic(trend.id, { status: "researching" });

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
        verified += 1;
        await logTrendAutomation({
          type: "verify",
          trendId: trend.id,
          message: verification.notes,
          category: trend.category,
          status: "verified",
        });
      } else {
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
        insufficient += 1;
        await logTrendAutomation({
          type: "verify",
          trendId: trend.id,
          message: reason,
          category: trend.category,
          status: "insufficientSources",
        });
      }

      researched += 1;
      await logTrendAutomation({
        type: "research",
        trendId: trend.id,
        message: `Active sources=${activeCount}; matching articles=${candidates.length}`,
        category: trend.category,
        status: "researching",
      });
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

export async function researchSingleTrend(trendId: string) {
  const { getTrendTopicById } = await import("./server-db");
  const trend = await getTrendTopicById(trendId);
  if (!trend) throw new Error("Trend not found");

  await updateTrendTopic(trendId, { status: "fetched" });
  return runResearchTrends(1);
}
