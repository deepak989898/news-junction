import { Timestamp } from "firebase/firestore";
import { AppLanguage } from "@/types/app";
import { NewsArticle } from "@/types/news";

export function getArticleTitle(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.titleHi || article.titleEn : article.titleEn || article.titleHi;
}

export function getArticleSummary(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.summaryHi || article.summaryEn : article.summaryEn || article.summaryHi;
}

export function getArticleContent(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.contentHi || article.contentEn : article.contentEn || article.contentHi;
}

export function getArticleImageAlt(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.imageAltHi || article.imageAltEn : article.imageAltEn || article.imageAltHi;
}

export function getCategoryName(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.categoryNameHi || article.categoryNameEn : article.categoryNameEn || article.categoryNameHi;
}

export function getArticleAudioUrl(article: NewsArticle, lang: AppLanguage) {
  return lang === "hi" ? article.audioHiUrl || article.audioEnUrl : article.audioEnUrl || article.audioHiUrl;
}

export function getReadingTimeMinutes(article: NewsArticle, lang: AppLanguage) {
  const content = getArticleContent(article, lang).replace(/<[^>]+>/g, " ");
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatNewsDate(value: Timestamp | null | undefined, lang: AppLanguage) {
  if (!value) return "";
  const date = value.toDate();
  return date.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRelativeTime(value: Timestamp | null | undefined, lang: AppLanguage) {
  if (!value) return "";
  const diffMs = Date.now() - value.toDate().getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return lang === "hi" ? `${mins} मिनट पहले` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "hi" ? `${hours} घंटे पहले` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "hi" ? `${days} दिन पहले` : `${days}d ago`;
}

export function extractGalleryImages(article: NewsArticle): string[] {
  const images = article.galleryImages?.filter(Boolean) || [];
  if (article.imageUrl) images.unshift(article.imageUrl);
  const content = `${article.contentHi} ${article.contentEn}`;
  const matches = content.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/gi) || [];
  return Array.from(new Set([...images, ...matches]));
}

export function buildArticleShareUrl(slug: string, apiBaseUrl: string) {
  if (!apiBaseUrl) return `https://newsjunction.in/article/${slug}`;
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/article/${slug}`;
}
