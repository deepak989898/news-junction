import Parser from "rss-parser";

export interface FetchedRssItem {
  originalTitle: string;
  originalLink: string;
  originalSummary: string;
  originalImage: string;
  originalPublishedAt: string | null;
}

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["enclosure", "enclosure"],
    ],
  },
});

function extractImage(item: Record<string, unknown>): string {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) return enclosure.url;

  const mediaContent = item.mediaContent as Array<{ $?: { url?: string } }> | undefined;
  if (mediaContent?.[0]?.$?.url) return mediaContent[0].$.url;

  const mediaThumbnail = item.mediaThumbnail as Array<{ $?: { url?: string } }> | undefined;
  if (mediaThumbnail?.[0]?.$?.url) return mediaThumbnail[0].$.url;

  const content = (item.content || item["content:encoded"] || "") as string;
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] || "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchRssFeed(feedUrl: string): Promise<FetchedRssItem[]> {
  const feed = await parser.parseURL(feedUrl);
  return (feed.items || []).slice(0, 15).map((item) => {
    const summary = stripHtml(item.contentSnippet || item.summary || item.content || "");
    const pubDate = item.isoDate || item.pubDate || null;
    return {
      originalTitle: (item.title || "").trim(),
      originalLink: (item.link || item.guid || "").trim(),
      originalSummary: summary.slice(0, 500),
      originalImage: extractImage(item as unknown as Record<string, unknown>),
      originalPublishedAt: pubDate ? new Date(pubDate).toISOString() : null,
    };
  }).filter((item) => item.originalTitle && item.originalLink);
}
