import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  QueryConstraint,
  Firestore,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  NewsArticle,
  Category,
  SiteSettings,
  AdminUser,
  NewsFormData,
  DashboardStats,
  NewsStatus,
  NewsSource,
  MediaItem,
  AdSlot,
} from "@/types";
import { createSlug } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { DEFAULT_SITE_SETTINGS, SETTINGS_DOC_ID } from "@/lib/settings-defaults";
import type { RawNewsItem, AutomationSettings, AutomationLog } from "@/lib/automation/types";
import { DEFAULT_AUTOMATION_SETTINGS, AUTOMATION_SETTINGS_DOC_ID } from "@/lib/automation/defaults";

let dbInstance: Firestore | null = null;

function getDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore is only available on the client");
  }
  if (!dbInstance) {
    const { getFirestore } = require("firebase/firestore") as typeof import("firebase/firestore");
    const { getFirebaseApp } = require("./config") as typeof import("./config");
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

const COLLECTIONS = {
  news: "news",
  categories: "categories",
  settings: "settings",
  users: "users",
  sources: "sources",
  media: "media",
  adSlots: "adSlots",
  rawNews: "rawNews",
  automationLogs: "automationLogs",
} as const;

function mapNewsDoc(id: string, data: Record<string, unknown>): NewsArticle {
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
    seoTitle: (data.seoTitle as string) || "",
    seoDescription: (data.seoDescription as string) || "",
    canonicalUrl: (data.canonicalUrl as string) || "",
    scheduledPublishAt: (data.scheduledPublishAt as Timestamp) || null,
    createdAt: (data.createdAt as Timestamp) || null,
    updatedAt: (data.updatedAt as Timestamp) || null,
    publishedAt: (data.publishedAt as Timestamp) || null,
  };
}

function buildNewsPayload(data: NewsFormData, category: Category, existingPublishedAt?: Timestamp | null) {
  const tags = data.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const scheduledDate = data.scheduledPublishAt ? new Date(data.scheduledPublishAt) : null;
  const isPublished = data.status === "published";

  return {
    titleHi: data.titleHi,
    titleEn: data.titleEn,
    slug: data.slug || createSlug(data.titleEn || data.titleHi),
    summaryHi: data.summaryHi,
    summaryEn: data.summaryEn,
    contentHi: data.contentHi,
    contentEn: data.contentEn,
    categoryId: category.id,
    categoryNameHi: category.nameHi,
    categoryNameEn: category.nameEn,
    imageUrl: data.imageUrl,
    imageAltHi: data.imageAltHi,
    imageAltEn: data.imageAltEn,
    author: data.author || "News Junction Team",
    sourceName: data.sourceName,
    sourceUrl: data.sourceUrl,
    tags,
    status: data.status,
    isBreaking: data.isBreaking,
    isFeatured: data.isFeatured,
    isTrending: data.isTrending,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    canonicalUrl: data.canonicalUrl,
    scheduledPublishAt: scheduledDate ? Timestamp.fromDate(scheduledDate) : null,
    publishedAt:
      isPublished && !existingPublishedAt
        ? serverTimestamp()
        : existingPublishedAt || null,
    updatedAt: serverTimestamp(),
  };
}

export async function getPublishedNews(constraints: QueryConstraint[] = []) {
  const q = query(
    collection(getDb(), COLLECTIONS.news),
    where("status", "==", "published"),
    ...constraints
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapNewsDoc(d.id, d.data()));
}

export async function getFeaturedNews(count = 4) {
  return getPublishedNews([
    where("isFeatured", "==", true),
    orderBy("publishedAt", "desc"),
    limit(count),
  ]);
}

export async function getTrendingNews(count = 6) {
  return getPublishedNews([
    where("isTrending", "==", true),
    orderBy("publishedAt", "desc"),
    limit(count),
  ]);
}

export async function getBreakingNews(count = 5) {
  return getPublishedNews([
    where("isBreaking", "==", true),
    orderBy("publishedAt", "desc"),
    limit(count),
  ]);
}

export async function getLatestNews(count = 12) {
  return getPublishedNews([orderBy("publishedAt", "desc"), limit(count)]);
}

export async function getPopularNews(count = 5) {
  return getPublishedNews([orderBy("views", "desc"), limit(count)]);
}

export async function getNewsByCategory(categorySlug: string, count = 20) {
  return getPublishedNews([
    where("categoryId", "==", categorySlug),
    orderBy("publishedAt", "desc"),
    limit(count),
  ]);
}

export async function getNewsBySlug(slug: string) {
  const q = query(collection(getDb(), COLLECTIONS.news), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return mapNewsDoc(docSnap.id, docSnap.data());
}

export async function getRelatedNews(categoryId: string, excludeId: string, count = 4) {
  const articles = await getPublishedNews([
    where("categoryId", "==", categoryId),
    orderBy("publishedAt", "desc"),
    limit(count + 1),
  ]);
  return articles.filter((a) => a.id !== excludeId).slice(0, count);
}

export async function searchNews(searchTerm: string, count = 20) {
  const allNews = await getPublishedNews([orderBy("publishedAt", "desc"), limit(50)]);
  const term = searchTerm.toLowerCase();
  return allNews
    .filter(
      (article) =>
        article.titleHi.toLowerCase().includes(term) ||
        article.titleEn.toLowerCase().includes(term) ||
        article.summaryHi.toLowerCase().includes(term) ||
        article.summaryEn.toLowerCase().includes(term)
    )
    .slice(0, count);
}

export async function incrementNewsViews(id: string) {
  const ref = doc(getDb(), COLLECTIONS.news, id);
  await updateDoc(ref, { views: increment(1) });
}

export async function getAllNewsForAdmin() {
  const q = query(collection(getDb(), COLLECTIONS.news), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapNewsDoc(d.id, d.data()));
}

export async function getNewsById(id: string) {
  const ref = doc(getDb(), COLLECTIONS.news, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return mapNewsDoc(snapshot.id, snapshot.data());
}

export async function isNewsSlugTaken(slug: string, excludeId?: string) {
  const q = query(collection(getDb(), COLLECTIONS.news), where("slug", "==", slug));
  const snapshot = await getDocs(q);
  return snapshot.docs.some((d) => d.id !== excludeId);
}

export async function createNews(data: NewsFormData, category: Category) {
  const slug = data.slug || createSlug(data.titleEn || data.titleHi);
  const newsData = {
    ...buildNewsPayload(data, category),
    slug,
    language: "hi" as const,
    views: 0,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(getDb(), COLLECTIONS.news), newsData);
  return ref.id;
}

export async function updateNews(id: string, data: NewsFormData, category: Category) {
  const ref = doc(getDb(), COLLECTIONS.news, id);
  const existing = await getDoc(ref);
  const existingData = existing.data();
  await updateDoc(
    ref,
    buildNewsPayload(
      { ...data, slug: data.slug || createSlug(data.titleEn || data.titleHi) },
      category,
      (existingData?.publishedAt as Timestamp) || null
    )
  );
}

export async function deleteNews(id: string) {
  await deleteDoc(doc(getDb(), COLLECTIONS.news, id));
}

export async function bulkUpdateNewsStatus(ids: string[], status: NewsStatus) {
  const batch = writeBatch(getDb());
  ids.forEach((id) => {
    const ref = doc(getDb(), COLLECTIONS.news, id);
    batch.update(ref, {
      status,
      updatedAt: serverTimestamp(),
      ...(status === "published" ? { publishedAt: serverTimestamp() } : {}),
    });
  });
  await batch.commit();
}

export async function bulkDeleteNews(ids: string[]) {
  const batch = writeBatch(getDb());
  ids.forEach((id) => batch.delete(doc(getDb(), COLLECTIONS.news, id)));
  await batch.commit();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [newsSnap, categories] = await Promise.all([
    getDocs(collection(getDb(), COLLECTIONS.news)),
    getAllCategories(),
  ]);

  let publishedNews = 0;
  let draftNews = 0;
  let breakingNews = 0;
  let featuredNews = 0;
  let trendingNews = 0;
  let totalViews = 0;

  newsSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.status === "published") publishedNews++;
    else draftNews++;
    if (data.isBreaking) breakingNews++;
    if (data.isFeatured) featuredNews++;
    if (data.isTrending) trendingNews++;
    totalViews += (data.views as number) || 0;
  });

  return {
    totalNews: newsSnap.size,
    publishedNews,
    draftNews,
    breakingNews,
    featuredNews,
    trendingNews,
    totalCategories: categories.filter((c) => c.slug !== "home").length,
    totalViews,
  };
}

export async function getRecentNews(status: NewsStatus, count = 5) {
  try {
    const q = query(
      collection(getDb(), COLLECTIONS.news),
      where("status", "==", status),
      orderBy("updatedAt", "desc"),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapNewsDoc(d.id, d.data()));
  } catch {
    const all = await getAllNewsForAdmin();
    return all.filter((a) => a.status === status).slice(0, count);
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(
      collection(getDb(), COLLECTIONS.categories),
      where("isActive", "==", true),
      orderBy("order", "asc")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return DEFAULT_CATEGORIES.filter((c) => c.isActive);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Category, "id">),
    }));
  } catch {
    return DEFAULT_CATEGORIES.filter((c) => c.isActive);
  }
}

export async function getAllCategories(): Promise<Category[]> {
  try {
    const q = query(collection(getDb(), COLLECTIONS.categories), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return DEFAULT_CATEGORIES;
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Category, "id">),
    }));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function isCategorySlugTaken(slug: string, excludeId?: string) {
  const q = query(collection(getDb(), COLLECTIONS.categories), where("slug", "==", slug));
  const snapshot = await getDocs(q);
  return snapshot.docs.some((d) => d.id !== excludeId);
}

export async function createCategory(data: Omit<Category, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.categories), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const ref = doc(getDb(), COLLECTIONS.categories, id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(getDb(), COLLECTIONS.categories, id));
}

export async function reorderCategories(orderedIds: string[]) {
  const batch = writeBatch(getDb());
  orderedIds.forEach((id, index) => {
    batch.update(doc(getDb(), COLLECTIONS.categories, id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function seedDefaultCategories() {
  const existing = await getAllCategories();
  if (existing.length > 0 && existing !== DEFAULT_CATEGORIES) {
    const snap = await getDocs(collection(getDb(), COLLECTIONS.categories));
    if (!snap.empty) return;
  }
  const batch = writeBatch(getDb());
  DEFAULT_CATEGORIES.forEach((cat) => {
    const ref = doc(getDb(), COLLECTIONS.categories, cat.id);
    batch.set(ref, {
      nameHi: cat.nameHi,
      nameEn: cat.nameEn,
      slug: cat.slug,
      descriptionHi: cat.descriptionHi || "",
      descriptionEn: cat.descriptionEn || "",
      isActive: cat.isActive,
      order: cat.order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

function normalizeSettings(data: Record<string, unknown>): SiteSettings {
  const merged = { ...DEFAULT_SITE_SETTINGS, ...data } as SiteSettings & {
    seoTitle?: string;
    seoDescription?: string;
  };
  return {
    ...merged,
    metaTitle: merged.metaTitle || merged.seoTitle || DEFAULT_SITE_SETTINGS.metaTitle,
    metaDescription:
      merged.metaDescription || merged.seoDescription || DEFAULT_SITE_SETTINGS.metaDescription,
    socialLinks: {
      ...DEFAULT_SITE_SETTINGS.socialLinks,
      ...(data.socialLinks as SiteSettings["socialLinks"]),
    },
  };
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const siteRef = doc(getDb(), COLLECTIONS.settings, SETTINGS_DOC_ID);
    const siteSnap = await getDoc(siteRef);
    if (siteSnap.exists()) return normalizeSettings(siteSnap.data());

    const legacyRef = doc(getDb(), COLLECTIONS.settings, "general");
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) return normalizeSettings(legacySnap.data());

    return DEFAULT_SITE_SETTINGS;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function updateSettings(settings: Partial<SiteSettings>) {
  const ref = doc(getDb(), COLLECTIONS.settings, SETTINGS_DOC_ID);
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  const ref = doc(getDb(), COLLECTIONS.users, uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return {
    uid: snapshot.id,
    ...(snapshot.data() as Omit<AdminUser, "uid">),
  };
}

export async function createAdminUser(uid: string, data: Omit<AdminUser, "uid" | "createdAt">) {
  const ref = doc(getDb(), COLLECTIONS.users, uid);
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
}

// Sources
function mapSourceDoc(id: string, data: Record<string, unknown>): NewsSource {
  return {
    id,
    name: (data.name as string) || "",
    type: (data.type as NewsSource["type"]) || "RSS",
    url: (data.url as string) || "",
    language: (data.language as NewsSource["language"]) || "Both",
    categoryId: (data.categoryId as string) || "",
    isActive: Boolean(data.isActive),
    trustLevel: (data.trustLevel as NewsSource["trustLevel"]) || "medium",
    autoPublishAllowed: Boolean(data.autoPublishAllowed),
    createdAt: (data.createdAt as Timestamp) || null,
    updatedAt: (data.updatedAt as Timestamp) || null,
  };
}

export async function getAllSources() {
  const q = query(collection(getDb(), COLLECTIONS.sources), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapSourceDoc(d.id, d.data()));
}

export async function createSource(data: Omit<NewsSource, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.sources), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSource(id: string, data: Partial<NewsSource>) {
  await updateDoc(doc(getDb(), COLLECTIONS.sources, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSource(id: string) {
  await deleteDoc(doc(getDb(), COLLECTIONS.sources, id));
}

// Media
function mapMediaDoc(id: string, data: Record<string, unknown>): MediaItem {
  return {
    id,
    url: (data.url as string) || "",
    filename: (data.filename as string) || "",
    altHi: (data.altHi as string) || "",
    altEn: (data.altEn as string) || "",
    uploadedBy: (data.uploadedBy as string) || "",
    createdAt: (data.createdAt as Timestamp) || null,
    size: (data.size as number) || 0,
    contentType: (data.contentType as string) || "",
  };
}

export async function getAllMedia() {
  const q = query(collection(getDb(), COLLECTIONS.media), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapMediaDoc(d.id, d.data()));
}

export async function createMediaItem(data: Omit<MediaItem, "id" | "createdAt">) {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.media), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMediaItem(id: string, data: Partial<MediaItem>) {
  await updateDoc(doc(getDb(), COLLECTIONS.media, id), data);
}

export async function deleteMediaItem(id: string) {
  await deleteDoc(doc(getDb(), COLLECTIONS.media, id));
}

// Ad Slots
function mapAdSlotDoc(id: string, data: Record<string, unknown>): AdSlot {
  return {
    id,
    name: (data.name as string) || "",
    location: (data.location as AdSlot["location"]) || "sidebar",
    code: (data.code as string) || "",
    isActive: Boolean(data.isActive),
    createdAt: (data.createdAt as Timestamp) || null,
    updatedAt: (data.updatedAt as Timestamp) || null,
  };
}

export async function getAllAdSlots() {
  const q = query(collection(getDb(), COLLECTIONS.adSlots), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapAdSlotDoc(d.id, d.data()));
}

export async function getActiveAdSlots() {
  const q = query(
    collection(getDb(), COLLECTIONS.adSlots),
    where("isActive", "==", true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapAdSlotDoc(d.id, d.data()));
}

export async function createAdSlot(data: Omit<AdSlot, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.adSlots), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAdSlot(id: string, data: Partial<AdSlot>) {
  await updateDoc(doc(getDb(), COLLECTIONS.adSlots, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAdSlot(id: string) {
  await deleteDoc(doc(getDb(), COLLECTIONS.adSlots, id));
}

// Automation - client read/write for admin UI

function mapRawNewsClient(id: string, data: Record<string, unknown>): RawNewsItem {
  return {
    id,
    sourceId: (data.sourceId as string) || "",
    sourceName: (data.sourceName as string) || "",
    sourceUrl: (data.sourceUrl as string) || "",
    sourceType: (data.sourceType as string) || "",
    originalTitle: (data.originalTitle as string) || "",
    originalLink: (data.originalLink as string) || "",
    originalSummary: (data.originalSummary as string) || "",
    originalImage: (data.originalImage as string) || "",
    originalPublishedAt: (data.originalPublishedAt as string) || null,
    language: (data.language as string) || "Both",
    categoryId: (data.categoryId as string) || "",
    status: (data.status as RawNewsItem["status"]) || "fetched",
    riskLevel: (data.riskLevel as RawNewsItem["riskLevel"]) || "medium",
    duplicateScore: (data.duplicateScore as number) || 0,
    aiOutput: (data.aiOutput as RawNewsItem["aiOutput"]) || null,
    newsId: data.newsId as string | undefined,
    errorMessage: data.errorMessage as string | undefined,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate?.()?.toISOString() || null : null,
    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate?.()?.toISOString() || null : null,
  };
}

export async function getAllRawNews(limitCount = 100): Promise<RawNewsItem[]> {
  const q = query(collection(getDb(), COLLECTIONS.rawNews), orderBy("createdAt", "desc"), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapRawNewsClient(d.id, d.data()));
}

export async function getRawNewsClient(id: string): Promise<RawNewsItem | null> {
  const ref = doc(getDb(), COLLECTIONS.rawNews, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapRawNewsClient(snap.id, snap.data());
}

export async function updateRawNewsClient(id: string, data: Record<string, unknown>) {
  await updateDoc(doc(getDb(), COLLECTIONS.rawNews, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getAutomationSettingsClient(): Promise<AutomationSettings> {
  const ref = doc(getDb(), COLLECTIONS.settings, AUTOMATION_SETTINGS_DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_AUTOMATION_SETTINGS };
  const data = snap.data();
  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    ...data,
    lastFetchRun: data.lastFetchRun?.toDate?.()?.toISOString() || data.lastFetchRun || null,
    lastProcessRun: data.lastProcessRun?.toDate?.()?.toISOString() || data.lastProcessRun || null,
    lastCleanupRun: data.lastCleanupRun?.toDate?.()?.toISOString() || data.lastCleanupRun || null,
  } as AutomationSettings;
}

export async function updateAutomationSettingsClient(settings: Partial<AutomationSettings>) {
  const ref = doc(getDb(), COLLECTIONS.settings, AUTOMATION_SETTINGS_DOC_ID);
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getAutomationLogsClient(limitCount = 20): Promise<AutomationLog[]> {
  const q = query(collection(getDb(), COLLECTIONS.automationLogs), orderBy("createdAt", "desc"), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      message: data.message,
      sourceId: data.sourceId,
      rawNewsId: data.rawNewsId,
      newsId: data.newsId,
      status: data.status,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    } as AutomationLog;
  });
}

export async function getAutomationStatsClient() {
  const allRaw = await getAllRawNews(200);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const today = allRaw.filter((r) => r.createdAt && new Date(r.createdAt) >= startOfDay);

  return {
    fetchedToday: today.length,
    processedToday: today.filter((r) =>
      ["pendingApproval", "approved", "published", "processing"].includes(r.status)
    ).length,
    publishedToday: today.filter((r) => r.status === "published").length,
    pendingApproval: allRaw.filter((r) => r.status === "pendingApproval").length,
    failed: allRaw.filter((r) => r.status === "failed").length,
    duplicates: allRaw.filter((r) => r.status === "duplicate").length,
  };
}
