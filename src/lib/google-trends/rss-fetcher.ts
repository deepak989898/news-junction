import Parser from "rss-parser";
import { CATEGORY_INFERENCE_RULES, GOOGLE_TRENDS_RSS_URLS } from "./defaults";
import { FetchedGoogleTrendItem } from "./types";

interface GoogleTrendRssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  approxTraffic?: string;
  newsItems?: Array<{
    "ht:news_item_title"?: string;
    "ht:news_item_url"?: string;
    "ht:news_item_snippet"?: string;
    newsItemTitle?: string;
    newsItemUrl?: string;
    newsItemSnippet?: string;
  }>;
}

const parser = new Parser({
  customFields: {
    item: [
      ["ht:approx_traffic", "approxTraffic"],
      ["ht:news_item", "newsItems", { keepArray: true }],
    ],
  },
});

function parseTraffic(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9+]/g, "").replace("+", "");
  return Number(cleaned) || 0;
}

export function inferGoogleCategory(title: string, relatedText: string): string {
  const combined = `${title} ${relatedText}`;
  for (const rule of CATEGORY_INFERENCE_RULES) {
    if (rule.pattern.test(combined)) return rule.category;
  }
  return "All";
}

export function normalizeTrendTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNewsItems(item: GoogleTrendRssItem) {
  const items = item.newsItems || [];
  return items
    .map((n) => ({
      title: n["ht:news_item_title"] || n.newsItemTitle || "",
      url: n["ht:news_item_url"] || n.newsItemUrl || "",
      snippet: n["ht:news_item_snippet"] || n.newsItemSnippet || "",
    }))
    .filter((n) => n.title && n.url);
}

/**
 * Fetch India trending topics via official Google Trends RSS export.
 * Does NOT scrape the Google Trends HTML interface.
 */
export async function fetchGoogleTrendsRss(
  country = "IN",
  itemLimit = 20
): Promise<FetchedGoogleTrendItem[]> {
  const feedUrl = GOOGLE_TRENDS_RSS_URLS[country];
  if (!feedUrl) throw new Error(`No RSS URL configured for country ${country}`);

  const feed = await parser.parseURL(feedUrl);
  const now = new Date().toISOString();

  return (feed.items || []).slice(0, itemLimit).map((raw) => {
    const item = raw as unknown as GoogleTrendRssItem;
    const title = (item.title || "").trim();
    const relatedNews = extractNewsItems(item);
    const relatedText = relatedNews.map((n) => `${n.title} ${n.snippet}`).join(" ");
    const category = inferGoogleCategory(title, relatedText);

    return {
      title,
      normalizedTitle: normalizeTrendTitle(title),
      relatedQueries: relatedNews.map((n) => n.title).slice(0, 5),
      searchVolume: parseTraffic(item.approxTraffic),
      category,
      sourceUrl: item.link || feedUrl,
      fetchedAt: now,
      relatedNews,
      trendStatus: "active" as const,
    };
  }).filter((t) => t.title && t.normalizedTitle);
}

/** Future-ready stub — only when official API credentials exist */
export async function fetchGoogleTrendsOfficialApi(
  _country: string,
  _itemLimit: number
): Promise<FetchedGoogleTrendItem[]> {
  if (!process.env.GOOGLE_TRENDS_API_KEY || process.env.GOOGLE_TRENDS_API_ENABLED !== "true") {
    throw new Error("Official Google Trends API is not configured");
  }
  throw new Error("Official Google Trends API mode is reserved for future alpha access");
}

export async function fetchGoogleTrends(
  mode: "rss" | "officialApi",
  country: string,
  itemLimit: number
): Promise<FetchedGoogleTrendItem[]> {
  if (mode === "officialApi") {
    return fetchGoogleTrendsOfficialApi(country, itemLimit);
  }
  return fetchGoogleTrendsRss(country, itemLimit);
}
