import { SourceLanguage, SourceType, TrustLevel } from "@/types";

export interface DefaultNewsSource {
  name: string;
  type: SourceType;
  url: string;
  language: SourceLanguage;
  categoryId: string;
  trustLevel: TrustLevel;
}

export const RECOMMENDED_NEWS_SOURCES: DefaultNewsSource[] = [
  {
    name: "BBC Hindi",
    type: "RSS",
    url: "https://feeds.bbci.co.uk/hindi/rss.xml",
    language: "Hindi",
    categoryId: "desh",
    trustLevel: "high",
  },
  {
    name: "NDTV Top Stories",
    type: "RSS",
    url: "https://feeds.feedburner.com/ndtvnews-top-stories",
    language: "Both",
    categoryId: "desh",
    trustLevel: "high",
  },
  {
    name: "Times of India",
    type: "RSS",
    url: "https://timesofindia.indiatimes.com/rssfeedmostread.cms",
    language: "English",
    categoryId: "desh",
    trustLevel: "medium",
  },
  {
    name: "BBC World",
    type: "RSS",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    language: "English",
    categoryId: "duniya",
    trustLevel: "high",
  },
  {
    name: "ESPN Cricinfo",
    type: "RSS",
    url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml",
    language: "English",
    categoryId: "khel",
    trustLevel: "high",
  },
  {
    name: "TechCrunch",
    type: "RSS",
    url: "https://techcrunch.com/feed/",
    language: "English",
    categoryId: "technology",
    trustLevel: "medium",
  },
  {
    name: "Economic Times",
    type: "RSS",
    url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
    language: "English",
    categoryId: "vyapar",
    trustLevel: "medium",
  },
  {
    name: "Health News BBC",
    type: "RSS",
    url: "https://feeds.bbci.co.uk/news/health/rss.xml",
    language: "English",
    categoryId: "swasthya",
    trustLevel: "high",
  },
  {
    name: "Entertainment BBC",
    type: "RSS",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    language: "English",
    categoryId: "manoranjan",
    trustLevel: "medium",
  },
];
