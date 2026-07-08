import {
  getAutomationSettings,
  getActiveSources,
  createRawNewsItem,
  logAutomation,
  updateAutomationSettings,
  getRawNewsByStatus,
} from "./server-db";
import { fetchRssFeed } from "./rss-fetcher";
import { fetchGdeltItems } from "./gdelt-fetcher";
import { checkDuplicate } from "./duplicate-checker";
import { detectRiskLevel } from "./risk-detector";
import { processRawNewsItem } from "./process-pipeline";

export async function runFetchNews(): Promise<{
  fetched: number;
  duplicates: number;
  errors: number;
}> {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return { fetched: 0, duplicates: 0, errors: 0 };
  }

  let fetched = 0;
  let duplicates = 0;
  let errors = 0;

  const sources = await getActiveSources();

  for (const source of sources) {
    try {
      let items: Array<{
        originalTitle: string;
        originalLink: string;
        originalSummary: string;
        originalImage: string;
        originalPublishedAt: string | null;
      }> = [];

      if (source.type === "RSS" || source.type === "Official") {
        items = await fetchRssFeed(source.url as string);
      } else if (source.type === "GDELT") {
        items = await fetchGdeltItems(5);
      } else {
        continue;
      }

      for (const item of items) {
        const dup = await checkDuplicate(
          item.originalLink,
          item.originalTitle,
          settings.duplicateThreshold
        );

        if (dup.isDuplicate) {
          duplicates++;
          await createRawNewsItem({
            sourceId: source.id as string,
            sourceName: source.name as string,
            sourceUrl: source.url as string,
            sourceType: source.type as string,
            ...item,
            language: (source.language as string) || "Both",
            categoryId: (source.categoryId as string) || "desh",
            status: "duplicate",
            duplicateScore: dup.duplicateScore,
            riskLevel: detectRiskLevel(item.originalTitle, item.originalSummary, source.categoryId as string),
          });
          continue;
        }

        await createRawNewsItem({
          sourceId: source.id as string,
          sourceName: source.name as string,
          sourceUrl: source.url as string,
          sourceType: source.type as string,
          ...item,
          language: (source.language as string) || "Both",
          categoryId: (source.categoryId as string) || "desh",
          status: "fetched",
          riskLevel: detectRiskLevel(item.originalTitle, item.originalSummary, source.categoryId as string),
        });
        fetched++;
      }

      await logAutomation({
        type: "fetch",
        message: `Fetched ${items.length} items from ${source.name}`,
        sourceId: source.id as string,
        status: "success",
      });
    } catch (error) {
      errors++;
      const msg = error instanceof Error ? error.message : "Fetch failed";
      await logAutomation({
        type: "error",
        message: `Source ${source.name}: ${msg}`,
        sourceId: source.id as string,
        status: "error",
      });
    }
  }

  // Also fetch GDELT discovery if no dedicated GDELT source exists
  const hasGdeltSource = sources.some((s) => s.type === "GDELT");
  if (!hasGdeltSource) {
    try {
      const gdeltItems = await fetchGdeltItems(3);
      for (const item of gdeltItems) {
        const dup = await checkDuplicate(item.originalLink, item.originalTitle, settings.duplicateThreshold);
        if (dup.isDuplicate) { duplicates++; continue; }

        await createRawNewsItem({
          sourceId: "gdelt-system",
          sourceName: "GDELT Discovery",
          sourceUrl: "https://www.gdeltproject.org",
          sourceType: "GDELT",
          ...item,
          language: "Both",
          categoryId: "duniya",
          status: "fetched",
          riskLevel: detectRiskLevel(item.originalTitle, item.originalSummary, "duniya"),
        });
        fetched++;
      }
    } catch {
      errors++;
    }
  }

  await updateAutomationSettings({ lastFetchRun: new Date().toISOString() });
  return { fetched, duplicates, errors };
}

export async function runProcessNews(batchSize = 5): Promise<{
  processed: number;
  published: number;
  pending: number;
  failed: number;
}> {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return { processed: 0, published: 0, pending: 0, failed: 0 };
  }

  const items = await getRawNewsByStatus("fetched", batchSize);
  let processed = 0;
  let published = 0;
  let pending = 0;
  let failed = 0;

  for (const item of items) {
    const result = await processRawNewsItem(item.id);
    processed++;
    if (result.status === "published") published++;
    else if (result.status === "pendingApproval") pending++;
    else if (result.status === "failed") failed++;
  }

  await updateAutomationSettings({ lastProcessRun: new Date().toISOString() });
  return { processed, published, pending, failed };
}
