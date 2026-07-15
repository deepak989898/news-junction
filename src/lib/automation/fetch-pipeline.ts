import {
  getAutomationSettings,
  getActiveSources,
  createRawNewsItem,
  logAutomation,
  updateAutomationSettings,
  getRawNewsByStatus,
  countRawNewsByStatus,
} from "./server-db";
import { fetchRssFeed } from "./rss-fetcher";
import { fetchGdeltItems } from "./gdelt-fetcher";
import { checkDuplicate, isAlreadyQueuedExternalLink } from "./duplicate-checker";
import { detectRiskLevel } from "./risk-detector";
import { processRawNewsItem } from "./process-pipeline";

export async function runFetchNews(options?: {
  rssItemLimit?: number;
  skipGdeltDiscovery?: boolean;
  maxSources?: number;
}): Promise<{
  fetched: number;
  duplicates: number;
  skippedQueued: number;
  errors: number;
}> {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return { fetched: 0, duplicates: 0, skippedQueued: 0, errors: 0 };
  }

  const rssItemLimit = options?.rssItemLimit ?? 8;

  let fetched = 0;
  let duplicates = 0;
  let skippedQueued = 0;
  let errors = 0;

  const sources = await getActiveSources();
  const sourcesToUse = options?.maxSources ? sources.slice(0, options.maxSources) : sources;

  for (const source of sourcesToUse) {
    try {
      let items: Array<{
        originalTitle: string;
        originalLink: string;
        originalSummary: string;
        originalImage: string;
        originalPublishedAt: string | null;
      }> = [];

      if (source.type === "RSS" || source.type === "Official") {
        items = await fetchRssFeed(source.url as string, rssItemLimit);
      } else if (source.type === "GDELT") {
        items = await fetchGdeltItems(5);
      } else {
        continue;
      }

      for (const item of items) {
        // Already in our site → true duplicate (do not publish again)
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

        // Same external URL already in queue → don't create another duplicate row
        if (await isAlreadyQueuedExternalLink(item.originalLink)) {
          skippedQueued++;
          continue;
        }

        // External site story that we don't have yet → fetch for rewrite + publish
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

  const hasGdeltSource = sources.some((s) => s.type === "GDELT");
  if (!options?.skipGdeltDiscovery && !hasGdeltSource) {
    try {
      const gdeltItems = await fetchGdeltItems(3);
      for (const item of gdeltItems) {
        const dup = await checkDuplicate(item.originalLink, item.originalTitle, settings.duplicateThreshold);
        if (dup.isDuplicate) {
          duplicates++;
          continue;
        }
        if (await isAlreadyQueuedExternalLink(item.originalLink)) {
          skippedQueued++;
          continue;
        }

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
  return { fetched, duplicates, skippedQueued, errors };
}

export async function runProcessNews(
  batchSize = 1,
  options?: { preferHostedImage?: boolean; skipOpenAiImage?: boolean; maxMs?: number }
): Promise<{
  processed: number;
  published: number;
  pending: number;
  failed: number;
  duplicates: number;
}> {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return { processed: 0, published: 0, pending: 0, failed: 0, duplicates: 0 };
  }

  const items = await getRawNewsByStatus("fetched", batchSize);
  let processed = 0;
  let published = 0;
  let pending = 0;
  let failed = 0;
  let duplicates = 0;

  // Hobby plan ~60s limit: never run gpt-image during process; regenerate from admin later.
  const imageOpts = {
    preferHostedImage: options?.preferHostedImage !== false,
    skipOpenAiImage: options?.skipOpenAiImage !== false,
  };

  // Optional time budget so a single run can clear many items without hitting the function timeout.
  const startedAt = Date.now();
  const maxMs = options?.maxMs ?? 0;

  for (const item of items) {
    if (maxMs > 0 && Date.now() - startedAt > maxMs) break;
    const result = await processRawNewsItem(item.id, imageOpts);
    processed++;
    if (result.status === "published") published++;
    else if (result.status === "pendingApproval") pending++;
    else if (result.status === "duplicate") duplicates++;
    else if (result.status === "failed") failed++;
  }

  await updateAutomationSettings({ lastProcessRun: new Date().toISOString() });
  return { processed, published, pending, failed, duplicates };
}

export async function runAutoPublishCycle(options?: { force?: boolean; batchSize?: number }) {
  const settings = await getAutomationSettings();
  if (!settings.automationEnabled) {
    return {
      skipped: true,
      reason: "automationEnabled is false",
      fetched: 0,
      processed: 0,
      published: 0,
    };
  }

  const intervalMinutes = settings.publishIntervalMinutes || 30;
  const intervalMs = intervalMinutes * 60 * 1000;

  if (!options?.force && settings.lastProcessRun) {
    const elapsed = Date.now() - new Date(settings.lastProcessRun).getTime();
    if (elapsed < intervalMs - 60_000) {
      const waitMinutes = Math.ceil((intervalMs - elapsed) / 60_000);
      return {
        skipped: true,
        reason: `Waiting for ${intervalMinutes}-minute interval (${waitMinutes} min remaining)`,
        publishIntervalMinutes: intervalMinutes,
        fetched: 0,
        processed: 0,
        published: 0,
      };
    }
  }

  const fetchedBacklog = await countRawNewsByStatus("fetched");
  let fetchResult: { fetched: number; duplicates: number; skippedQueued: number; errors: number; skipped: boolean };

  if (fetchedBacklog === 0) {
    const fetched = await runFetchNews({
      rssItemLimit: 2,
      maxSources: 2,
      skipGdeltDiscovery: true,
    });
    fetchResult = { ...fetched, skipped: false };
  } else {
    fetchResult = { fetched: 0, duplicates: 0, skippedQueued: 0, errors: 0, skipped: true };
  }

  const batchSize = options?.batchSize ?? Math.max(settings.processBatchSizePerRun ?? 1, 8);
  const processResult = await runProcessNews(batchSize, { preferHostedImage: true, maxMs: 50_000 });

  return {
    skipped: false,
    publishIntervalMinutes: intervalMinutes,
    fetchedBacklog,
    fetch: fetchResult,
    process: processResult,
    published: processResult.published,
    processed: processResult.processed,
  };
}
