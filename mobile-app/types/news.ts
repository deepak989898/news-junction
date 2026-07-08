import { Timestamp } from "firebase/firestore";

export type Language = "hi" | "en";
export type NewsStatus = "draft" | "published";

export interface Category {
  id: string;
  nameHi: string;
  nameEn: string;
  slug: string;
  descriptionHi?: string;
  descriptionEn?: string;
  isActive: boolean;
  order: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NewsArticle {
  id: string;
  titleHi: string;
  titleEn: string;
  slug: string;
  summaryHi: string;
  summaryEn: string;
  contentHi: string;
  contentEn: string;
  categoryId: string;
  categoryNameHi: string;
  categoryNameEn: string;
  imageUrl: string;
  imageAltHi: string;
  imageAltEn: string;
  author: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  language: Language;
  status: NewsStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  views: number;
  galleryImages?: string[];
  audioHiUrl?: string;
  audioEnUrl?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

export interface NewsComment {
  id: string;
  articleId: string;
  uid: string;
  userName: string;
  userEmail?: string;
  text: string;
  parentId?: string | null;
  likes: number;
  likedBy: string[];
  reported: boolean;
  createdAt: Timestamp | null;
}

export type NewsSort = "latest" | "popular" | "trending";
export type NewsDateFilter = "all" | "today" | "week" | "month";
