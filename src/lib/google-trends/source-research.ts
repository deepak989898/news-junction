import { getActiveSources } from "@/lib/automation/server-db";
import { fetchRssFeed } from "@/lib/automation/rss-fetcher";
import { titleSimilarity } from "@/lib/automation/similarity";
import { TrendSourceCandidate, TrendTopic } from "./types";
import { normalizeTrendTitle } from "./rss-fetcher";

function keywordOverlap(a: string, b: string): number {
  const tokens = (s: string) =>
    normalizeTrendTitle(s)
      .split(" ")
      .filter((w) => w.length > 2);
  const setA = new Set(tokens(a));
  const setB = new Set(tokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap += 1;
  return overlap / Math.max(setA.size, setB.size);
}

function scoreMatch(trendTitle: string, articleTitle: string, summary: string): number {
  const titleScore = titleSimilarity(trendTitle, articleTitle);
  const keywordScore = keywordOverlap(trendTitle, `${articleTitle} ${summary}`);
  return Math.min(1, titleScore * 0.65 + keywordScore * 0.35);
}

/**
 * Search configured trusted RSS/Official sources for articles matching the trend.
 * Does NOT use Google Trends as a factual source.
 */
export async function researchTrendSources(
  trend: TrendTopic,
  options?: { timeoutMs?: number; maxSources?: number }
): Promise<Omit<TrendSourceCandidate, "id" | "createdAt">[]> {
  const timeoutMs = options?.timeoutMs || 25000;
  const maxSources = options?.maxSources || 8;
  const started = Date.now();
  const candidates: Omit<TrendSourceCandidate, "id" | "createdAt">[] = [];

  const sources = await getActiveSources();
  const rssSources = sources
    .filter((s) => s.type === "RSS" || s.type === "Official")
    .slice(0, maxSources);

  for (const source of rssSources) {
    if (Date.now() - started > timeoutMs) break;

    try {
      const items = await fetchRssFeed(String(source.url), 12);
      for (const item of items) {
        const matchScore = scoreMatch(trend.title, item.originalTitle, item.originalSummary);
        if (matchScore < 0.28) continue;

        candidates.push({
          trendId: trend.id,
          sourceName: String(source.name || "Source"),
          sourceUrl: item.originalLink,
          sourceType: String(source.type || "RSS"),
          title: item.originalTitle,
          summary: item.originalSummary,
          publishedAt: item.originalPublishedAt,
          trustLevel: (source.trustLevel as "low" | "medium" | "high") || "medium",
          matchScore,
          selected: false,
        });
      }
    } catch {
      // skip failed source
    }
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);
  const seen = new Set<string>();
  return candidates
    .filter((c) => {
      if (seen.has(c.sourceUrl)) return false;
      seen.add(c.sourceUrl);
      return true;
    })
    .slice(0, 12);
}
