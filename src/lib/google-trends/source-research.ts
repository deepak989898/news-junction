import { getActiveSources } from "@/lib/automation/server-db";
import { fetchRssFeed } from "@/lib/automation/rss-fetcher";
import { titleSimilarity } from "@/lib/automation/similarity";
import { TrendSourceCandidate, TrendTopic } from "./types";
import { normalizeTrendTitle } from "./rss-fetcher";

function significantTokens(text: string): string[] {
  return normalizeTrendTitle(text)
    .split(" ")
    .filter((w) => w.length >= 2)
    .filter((w) => !["the", "and", "for", "today", "news", "share", "price", "live", "update", "कि", "में", "की", "के", "है"].includes(w));
}

function keywordOverlap(a: string, b: string): number {
  const setA = new Set(significantTokens(a));
  const setB = new Set(significantTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap += 1;
  return overlap / Math.max(setA.size, setB.size);
}

/** True when any meaningful trend token appears in article text. */
function containsTrendKeyword(trendTitle: string, articleText: string): boolean {
  const tokens = significantTokens(trendTitle);
  if (!tokens.length) return false;
  const hay = normalizeTrendTitle(articleText);
  // Short tickers / 1-token trends ("tcs", "nifty") → substring match
  if (tokens.length <= 2) {
    return tokens.some((t) => hay.includes(t));
  }
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}

function scoreMatch(trendTitle: string, articleTitle: string, summary: string): number {
  const blob = `${articleTitle} ${summary}`;
  const titleScore = titleSimilarity(trendTitle, articleTitle);
  const keywordScore = keywordOverlap(trendTitle, blob);
  let score = Math.min(1, titleScore * 0.55 + keywordScore * 0.45);
  if (containsTrendKeyword(trendTitle, blob)) {
    score = Math.max(score, 0.42);
  }
  return score;
}

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "news-source";
  }
}

function sourceTypeOf(raw: unknown): string {
  const t = String(raw || "RSS").trim();
  if (/^official$/i.test(t)) return "Official";
  if (/^rss$/i.test(t)) return "RSS";
  return t || "RSS";
}

/**
 * Search configured trusted RSS/Official sources for articles matching the trend.
 * Also seeds candidates from Google Trends related news links for this topic.
 */
export async function researchTrendSources(
  trend: TrendTopic,
  options?: { timeoutMs?: number; maxSources?: number }
): Promise<Omit<TrendSourceCandidate, "id" | "createdAt">[]> {
  const timeoutMs = options?.timeoutMs || 45000;
  const maxSources = options?.maxSources || 20;
  const started = Date.now();
  const candidates: Omit<TrendSourceCandidate, "id" | "createdAt">[] = [];

  // 1) Seed from Google Trends related news (these are real articles for THIS trend)
  for (const news of trend.relatedNews || []) {
    if (!news?.url || !news?.title) continue;
    candidates.push({
      trendId: trend.id,
      sourceName: publisherFromUrl(news.url),
      sourceUrl: news.url,
      sourceType: "RSS",
      title: news.title,
      summary: news.snippet || news.title,
      publishedAt: null,
      trustLevel: "medium",
      matchScore: 0.85,
      selected: false,
    });
  }

  // 2) Search active CMS sources (prefer same category)
  const sources = await getActiveSources();
  const usable = sources.filter((s) => {
    const type = sourceTypeOf(s.type);
    return type === "RSS" || type === "Official";
  });

  const mappedCategory = String(trend.mappedCategoryId || "");
  const ranked = [...usable].sort((a, b) => {
    const aMatch = String(a.categoryId || "") === mappedCategory ? 0 : 1;
    const bMatch = String(b.categoryId || "") === mappedCategory ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    const trustRank = (t: unknown) => (t === "high" ? 0 : t === "medium" ? 1 : 2);
    return trustRank(a.trustLevel) - trustRank(b.trustLevel);
  });

  const sourcesToScan = ranked.slice(0, maxSources);

  for (const source of sourcesToScan) {
    if (Date.now() - started > timeoutMs) break;

    try {
      const items = await fetchRssFeed(String(source.url), 25);
      for (const item of items) {
        const matchScore = scoreMatch(trend.title, item.originalTitle, item.originalSummary);
        // Keep even softer matches from category-matched CMS feeds
        const sameCategory = String(source.categoryId || "") === mappedCategory;
        const minScore = sameCategory ? 0.18 : 0.28;
        if (matchScore < minScore) continue;

        candidates.push({
          trendId: trend.id,
          sourceName: String(source.name || "Source"),
          sourceUrl: item.originalLink,
          sourceType: sourceTypeOf(source.type),
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
      const key = c.sourceUrl || `${c.sourceName}|${c.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 16);
}
