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

/** Parse traffic strings like "200+", "5,000+", "10K+". */
export function parseTraffic(raw?: string): number {
  if (!raw) return 0;
  const text = String(raw).trim().toUpperCase().replace(/,/g, "");
  const match = text.match(/([\d.]+)\s*([KMB])?\+?/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  const mult =
    match[2] === "K" ? 1_000 : match[2] === "M" ? 1_000_000 : match[2] === "B" ? 1_000_000_000 : 1;
  return Math.round(base * mult);
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

async function loadTrendsRssXml(feedUrl: string): Promise<string> {
  const res = await fetch(feedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
      "Cache-Control": "no-cache",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Google Trends RSS HTTP ${res.status}`);
  const xml = await res.text();
  if (!xml.includes("<item>") && !xml.includes("<entry>")) {
    throw new Error("Google Trends RSS returned empty feed (blocked or rate-limited from server)");
  }
  return xml;
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

  const xml = await loadTrendsRssXml(feedUrl);
  const feed = await parser.parseString(xml);
  const now = new Date().toISOString();

  return (feed.items || [])
    .slice(0, itemLimit)
    .map((raw) => {
      const item = raw as unknown as GoogleTrendRssItem;
      const title = (item.title || "").trim();
      const relatedNews = extractNewsItems(item);
      const relatedText = relatedNews.map((n) => `${n.title} ${n.snippet}`).join(" ");
      const category = inferGoogleCategory(title, relatedText);
      let searchVolume = parseTraffic(item.approxTraffic);
      if (!searchVolume && relatedNews.length) {
        searchVolume = Math.max(100, relatedNews.length * 50);
      }
      if (!searchVolume) searchVolume = 100;

      return {
        title,
        normalizedTitle: normalizeTrendTitle(title),
        relatedQueries: relatedNews.map((n) => n.title).slice(0, 5),
        searchVolume,
        category,
        sourceUrl: item.link || feedUrl,
        fetchedAt: now,
        relatedNews,
        trendStatus: "active" as const,
      };
    })
    .filter((t) => t.title && t.normalizedTitle);
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
