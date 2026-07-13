import { detectRiskLevel } from "@/lib/automation/risk-detector";
import { checkTrendDuplicate } from "./duplicate-check";
import { fetchGoogleTrends } from "./rss-fetcher";
import {
  createTrendTopic,
  getGoogleTrendsSettings,
  logTrendAutomation,
  updateGoogleTrendsSettings,
} from "./server-db";
import { calculateTrendPriorityScore, mapGoogleCategoryToNewsJunction } from "./topic-score";

export async function runFetchGoogleTrends(options?: { isTest?: boolean }) {
  const settings = await getGoogleTrendsSettings();
  if (!settings.enabled && !options?.isTest) {
    return { fetched: 0, skipped: 0, duplicates: 0, message: "Google Trends pipeline disabled" };
  }

  if (settings.mode === "officialApi" && !settings.officialApiConfigured) {
    await logTrendAutomation({
      type: "error",
      message: "Official API mode selected but not configured — falling back to RSS",
      status: "failed",
    });
    settings.mode = "rss";
  }

  const items = await fetchGoogleTrends(
    settings.mode === "officialApi" && settings.officialApiConfigured ? "officialApi" : "rss",
    settings.country,
    settings.maximumTopicsPerRun
  );

  let fetched = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      if (settings.activeOnly && item.trendStatus !== "active") {
        skipped += 1;
        continue;
      }
      if (item.searchVolume < settings.minimumSearchVolume) {
        skipped += 1;
        continue;
      }

      const title = options?.isTest ? `SYSTEM_TEST_TREND_${item.title}` : item.title;
      const dup = await checkTrendDuplicate(title, item.normalizedTitle);
      if (dup.isDuplicate) {
        duplicates += 1;
        await logTrendAutomation({
          type: "fetch",
          message: `Duplicate trend skipped: ${title}`,
          status: "duplicate",
          category: item.category,
        });
        continue;
      }

      const mapped = mapGoogleCategoryToNewsJunction(item.category, settings);
      const riskLevel = detectRiskLevel(title, item.relatedQueries.join(" "), mapped.categoryId);
      const priorityScore = calculateTrendPriorityScore({
        searchVolume: item.searchVolume,
        growthPercentage: 0,
        trendStatus: item.trendStatus,
        category: item.category,
        sourceCandidateCount: item.relatedNews.length,
        duplicateScore: dup.duplicateScore,
        riskLevel,
        fetchedAt: item.fetchedAt,
      });

      await createTrendTopic({
        trendId: `trend-${item.normalizedTitle.slice(0, 80)}`,
        title,
        normalizedTitle: item.normalizedTitle,
        relatedQueries: item.relatedQueries,
        searchVolume: item.searchVolume,
        growthPercentage: 0,
        trendStatus: item.trendStatus,
        startedAt: item.fetchedAt,
        endedAt: null,
        category: item.category,
        mappedCategoryId: mapped.categoryId,
        country: settings.country,
        sourceType: settings.mode === "officialApi" ? "googleTrendsApi" : "googleTrendsRss",
        sourceUrl: item.sourceUrl,
        fetchedAt: item.fetchedAt,
        status: "fetched",
        riskLevel,
        duplicateScore: dup.duplicateScore,
        priorityScore,
        isTestRecord: Boolean(options?.isTest),
      });

      fetched += 1;
      await logTrendAutomation({
        type: "fetch",
        message: `Fetched trend: ${title}`,
        category: item.category,
        status: "fetched",
      });
    } catch (err) {
      await logTrendAutomation({
        type: "error",
        message: err instanceof Error ? err.message : "Fetch item failed",
        status: "failed",
        category: item.category,
      });
    }
  }

  await updateGoogleTrendsSettings({ lastFetchRun: new Date().toISOString() });

  return { fetched, duplicates, skipped, total: items.length };
}
