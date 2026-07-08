import { Timestamp } from "firebase/firestore";
import { NewsArticle, NewsStatus } from "@/types/news";

export function mapNewsDoc(id: string, data: Record<string, unknown>): NewsArticle {
  return {
    id,
    titleHi: (data.titleHi as string) || "",
    titleEn: (data.titleEn as string) || "",
    slug: (data.slug as string) || "",
    summaryHi: (data.summaryHi as string) || "",
    summaryEn: (data.summaryEn as string) || "",
    contentHi: (data.contentHi as string) || "",
    contentEn: (data.contentEn as string) || "",
    categoryId: (data.categoryId as string) || "",
    categoryNameHi: (data.categoryNameHi as string) || "",
    categoryNameEn: (data.categoryNameEn as string) || "",
    imageUrl: (data.imageUrl as string) || "",
    imageAltHi: (data.imageAltHi as string) || "",
    imageAltEn: (data.imageAltEn as string) || "",
    author: (data.author as string) || "News Junction Team",
    sourceName: (data.sourceName as string) || "",
    sourceUrl: (data.sourceUrl as string) || "",
    tags: (data.tags as string[]) || [],
    language: (data.language as NewsArticle["language"]) || "hi",
    status: (data.status as NewsStatus) || "draft",
    isBreaking: Boolean(data.isBreaking),
    isFeatured: Boolean(data.isFeatured),
    isTrending: Boolean(data.isTrending),
    views: (data.views as number) || 0,
    galleryImages: (data.galleryImages as string[]) || [],
    audioHiUrl: (data.audioHiUrl as string) || "",
    audioEnUrl: (data.audioEnUrl as string) || "",
    createdAt: (data.createdAt as Timestamp) || null,
    updatedAt: (data.updatedAt as Timestamp) || null,
    publishedAt: (data.publishedAt as Timestamp) || null,
  };
}
