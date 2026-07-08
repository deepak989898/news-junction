import { Timestamp } from "firebase/firestore";

export type Language = "hi" | "en";
export type NewsStatus = "draft" | "published";
export type UserRole = "superAdmin" | "editor";
export type SourceType = "RSS" | "Official" | "Manual" | "GDELT";
export type SourceLanguage = "Hindi" | "English" | "Both";
export type TrustLevel = "low" | "medium" | "high";
export type AdLocation = "header" | "sidebar" | "inArticle" | "footer" | "mobile";

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
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  scheduledPublishAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  x: string;
  youtube: string;
  whatsapp: string;
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLanguage: Language;
  contactEmail: string;
  socialLinks: SocialLinks;
  adsEnabled: boolean;
  googleAnalyticsId: string;
  googleSearchConsoleVerification: string;
  metaTitle: string;
  metaDescription: string;
  footerText: string;
  // Legacy fields kept for backward compatibility
  seoTitle?: string;
  seoDescription?: string;
}

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp | null;
}

export interface NewsFormData {
  titleHi: string;
  titleEn: string;
  slug: string;
  summaryHi: string;
  summaryEn: string;
  contentHi: string;
  contentEn: string;
  categoryId: string;
  imageUrl: string;
  imageAltHi: string;
  imageAltEn: string;
  author: string;
  sourceName: string;
  sourceUrl: string;
  tags: string;
  status: NewsStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  scheduledPublishAt: string;
}

export interface DashboardStats {
  totalNews: number;
  publishedNews: number;
  draftNews: number;
  breakingNews: number;
  featuredNews: number;
  trendingNews: number;
  totalCategories: number;
  totalViews: number;
}

export interface NewsSource {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  language: SourceLanguage;
  categoryId: string;
  isActive: boolean;
  trustLevel: TrustLevel;
  autoPublishAllowed: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altHi: string;
  altEn: string;
  uploadedBy: string;
  createdAt: Timestamp | null;
  size: number;
  contentType: string;
}

export interface AdSlot {
  id: string;
  name: string;
  location: AdLocation;
  code: string;
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface NewsFilters {
  search: string;
  categoryId: string;
  status: NewsStatus | "all";
  flag: "all" | "breaking" | "featured" | "trending";
  sort: "newest" | "oldest" | "mostViewed";
}
