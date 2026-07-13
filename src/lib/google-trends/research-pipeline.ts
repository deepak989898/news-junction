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

  const topics = await getTrendTopicsByStatus("fetched", limit);
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
        await updateTrendTopic(trend.id, {
          status: "insufficientSources",
          riskLevel: verification.riskLevel,
          priorityScore,
          verificationNotes: verification.rejectionReason || verification.notes,
          errorMessage: verification.rejectionReason,
        });
        insufficient += 1;
        await logTrendAutomation({
          type: "verify",
          trendId: trend.id,
          message: verification.rejectionReason || "Insufficient sources",
          category: trend.category,
          status: "insufficientSources",
        });
      }

      researched += 1;
      await logTrendAutomation({
        type: "research",
        trendId: trend.id,
        message: `Found ${candidates.length} source candidates`,
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
