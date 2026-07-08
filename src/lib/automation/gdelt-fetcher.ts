import { GDELT_QUERIES } from "./defaults";

export interface FetchedGdeltItem {
  originalTitle: string;
  originalLink: string;
  originalSummary: string;
  originalImage: string;
  originalPublishedAt: string | null;
}

interface GdeltArticle {
  title?: string;
  url?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

export async function fetchGdeltItems(maxPerQuery = 5): Promise<FetchedGdeltItem[]> {
  const items: FetchedGdeltItem[] = [];
  const seenUrls = new Set<string>();

  for (const query of GDELT_QUERIES) {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxPerQuery}&format=json`;
      const response = await fetch(url, {
        headers: { "User-Agent": "NewsJunction/1.0" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const articles: GdeltArticle[] = data.articles || [];

      for (const article of articles) {
        if (!article.title || !article.url || seenUrls.has(article.url)) continue;
        seenUrls.add(article.url);

        let publishedAt: string | null = null;
        if (article.seendate) {
          const d = article.seendate;
          publishedAt = new Date(
            `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:00Z`
          ).toISOString();
        }

        items.push({
          originalTitle: article.title.trim(),
          originalLink: article.url.trim(),
          originalSummary: `Reported by ${article.domain || "GDELT"}. Topic: ${query}`,
          originalImage: "",
          originalPublishedAt: publishedAt,
        });
      }
    } catch {
      // Skip failed GDELT query, continue with others
    }
  }

  return items.slice(0, 20);
}
