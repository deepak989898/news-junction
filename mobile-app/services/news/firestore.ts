import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { Category, NewsArticle, NewsDateFilter, NewsSort } from "@/types/news";
import { mapNewsDoc } from "./map-news";

async function getPublishedNews(constraints: QueryConstraint[] = []) {
  const q = query(collection(db, COLLECTIONS.news), where("status", "==", "published"), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapNewsDoc(d.id, d.data()));
}

export async function getFeaturedNews(count = 5) {
  return getPublishedNews([where("isFeatured", "==", true), orderBy("publishedAt", "desc"), limit(count)]);
}

export async function getTrendingNews(count = 8) {
  return getPublishedNews([where("isTrending", "==", true), orderBy("publishedAt", "desc"), limit(count)]);
}

export async function getBreakingNews(count = 10) {
  return getPublishedNews([where("isBreaking", "==", true), orderBy("publishedAt", "desc"), limit(count)]);
}

export async function getLatestNews(count = 12) {
  return getPublishedNews([orderBy("publishedAt", "desc"), limit(count)]);
}

export async function getPopularNews(count = 8) {
  return getPublishedNews([orderBy("views", "desc"), limit(count)]);
}

export async function getRecentlyUpdatedNews(count = 8) {
  try {
    return await getPublishedNews([orderBy("updatedAt", "desc"), limit(count)]);
  } catch {
    const latest = await getLatestNews(count * 2);
    return [...latest]
      .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      .slice(0, count);
  }
}

export async function getLatestNewsPage(pageSize: number, cursor?: QueryDocumentSnapshot<DocumentData>) {
  const constraints: QueryConstraint[] = [orderBy("publishedAt", "desc"), limit(pageSize)];
  if (cursor) constraints.push(startAfter(cursor));
  const q = query(collection(db, COLLECTIONS.news), where("status", "==", "published"), ...constraints);
  const snapshot = await getDocs(q);
  return {
    items: snapshot.docs.map((d) => mapNewsDoc(d.id, d.data())),
    cursor: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function getNewsByCategory(
  categorySlug: string,
  count = 20,
  sort: NewsSort = "latest",
  dateFilter: NewsDateFilter = "all"
) {
  try {
    const constraints: QueryConstraint[] = [where("categoryId", "==", categorySlug)];
    if (sort === "popular") constraints.push(orderBy("views", "desc"));
    else if (sort === "trending") {
      constraints.push(where("isTrending", "==", true), orderBy("publishedAt", "desc"));
    } else {
      constraints.push(orderBy("publishedAt", "desc"));
    }
    constraints.push(limit(count));
    let items = await getPublishedNews(constraints);
    if (dateFilter !== "all") {
      const now = Date.now();
      const windowMs =
        dateFilter === "today" ? 86400000 : dateFilter === "week" ? 604800000 : 2592000000;
      items = items.filter((a) => {
        const ts = a.publishedAt?.toMillis() || 0;
        return now - ts <= windowMs;
      });
    }
    return items;
  } catch {
    let items = await getPublishedNews([
      where("categoryId", "==", categorySlug),
      orderBy("publishedAt", "desc"),
      limit(count * 2),
    ]);
    if (sort === "popular") items = [...items].sort((a, b) => b.views - a.views);
    if (sort === "trending") items = items.filter((a) => a.isTrending);
    if (dateFilter !== "all") {
      const now = Date.now();
      const windowMs =
        dateFilter === "today" ? 86400000 : dateFilter === "week" ? 604800000 : 2592000000;
      items = items.filter((a) => now - (a.publishedAt?.toMillis() || 0) <= windowMs);
    }
    return items.slice(0, count);
  }
}

export async function getNewsBySlug(slug: string) {
  const q = query(collection(db, COLLECTIONS.news), where("slug", "==", slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const article = mapNewsDoc(docSnap.id, docSnap.data());
  return article.status === "published" ? article : null;
}

export async function getNewsById(id: string) {
  const ref = doc(db, COLLECTIONS.news, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const article = mapNewsDoc(snapshot.id, snapshot.data());
  return article.status === "published" ? article : null;
}

export async function getRelatedNews(categoryId: string, excludeId: string, count = 4) {
  const articles = await getPublishedNews([
    where("categoryId", "==", categoryId),
    orderBy("publishedAt", "desc"),
    limit(count + 1),
  ]);
  return articles.filter((a) => a.id !== excludeId).slice(0, count);
}

export async function getNewsByIds(ids: string[]) {
  const unique = Array.from(new Set(ids)).slice(0, 20);
  const results = await Promise.all(unique.map((id) => getNewsById(id)));
  return results.filter((a): a is NewsArticle => Boolean(a));
}

export async function searchNews(searchTerm: string, count = 30, categoryId?: string) {
  const allNews = await getPublishedNews([orderBy("publishedAt", "desc"), limit(80)]);
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];
  return allNews
    .filter((article) => {
      if (categoryId && article.categoryId !== categoryId) return false;
      return (
        article.titleHi.toLowerCase().includes(term) ||
        article.titleEn.toLowerCase().includes(term) ||
        article.summaryHi.toLowerCase().includes(term) ||
        article.summaryEn.toLowerCase().includes(term) ||
        article.tags.some((t) => t.toLowerCase().includes(term))
      );
    })
    .slice(0, count);
}

export async function getCategories(): Promise<Category[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.categories),
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

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug || c.id === slug) || null;
}

export async function getLiveNewsUpdates(count = 20) {
  const breaking = await getBreakingNews(count);
  return [...breaking].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
}

export function getTrendingSearchTerms(articles: NewsArticle[]) {
  const counts = new Map<string, number>();
  articles.forEach((a) => {
    a.tags.forEach((tag) => {
      const key = tag.trim();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term]) => term);
}
