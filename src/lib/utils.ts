import { format, formatDistanceToNow } from "date-fns";
import { hi, enUS } from "date-fns/locale";
import slugify from "slugify";
import { Language, NewsArticle } from "@/types";

export function createSlug(title: string): string {
  return slugify(title, { lower: true, strict: true, locale: "en" });
}

export function getLocalizedField<T extends Record<string, unknown>>(
  item: T,
  field: string,
  language: Language
): string {
  const key = `${field}${language === "hi" ? "Hi" : "En"}`;
  const value = item[key];
  return typeof value === "string" ? value : "";
}

export function getArticleTitle(article: NewsArticle, language: Language): string {
  return language === "hi" ? article.titleHi : article.titleEn;
}

export function getArticleSummary(article: NewsArticle, language: Language): string {
  return language === "hi" ? article.summaryHi : article.summaryEn;
}

export function getArticleContent(article: NewsArticle, language: Language): string {
  return language === "hi" ? article.contentHi : article.contentEn;
}

export function formatRelativeTime(
  date: Date | null | undefined,
  language: Language
): string {
  if (!date) return "";
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: language === "hi" ? hi : enUS,
  });
}

/** Full date + time with AM/PM for admin tables. */
export function formatDateTime(
  date: Date | null | undefined,
  language: Language = "en"
): string {
  if (!date) return "—";
  const pattern = language === "hi" ? "dd MMM yyyy, hh:mm a" : "MMM d, yyyy h:mm a";
  return format(date, pattern, { locale: language === "hi" ? hi : enUS });
}

export function toDate(
  timestamp: { toDate?: () => Date } | string | Date | null | undefined
): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return null;
}

export function getArticlePublishDate(article: {
  publishedAt?: { toDate?: () => Date } | string | Date | null;
  createdAt?: { toDate?: () => Date } | string | Date | null;
}): Date | null {
  return toDate(article.publishedAt) || toDate(article.createdAt);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
