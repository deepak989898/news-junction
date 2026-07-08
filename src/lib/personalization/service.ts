import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_PERSONALIZATION_SETTINGS, defaultUserPreferences, PERSONALIZATION_SETTINGS_DOC_ID } from "./defaults";
import {
  PersonalizedRecommendation,
  PersonalizationAdminDashboard,
  PersonalizationSettings,
  UserBookmarkItem,
  UserDigest,
  UserFollow,
  UserPreferenceProfile,
  UserReadingHistoryItem,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function dedupeStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x).trim()).filter(Boolean))];
}

function toBool(v: unknown, fallback = false) {
  return typeof v === "boolean" ? v : fallback;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function logPersonalization(entry: {
  uid?: string;
  actionType: string;
  status: "success" | "failed" | "pending";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await getAdminDb().collection("personalizationLogs").add({
    ...entry,
    createdAt: nowIso(),
  });
}

export async function getPersonalizationSettings(): Promise<PersonalizationSettings> {
  const doc = await getAdminDb().collection("settings").doc(PERSONALIZATION_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_PERSONALIZATION_SETTINGS };
  return { ...DEFAULT_PERSONALIZATION_SETTINGS, ...(doc.data() as PersonalizationSettings) };
}

export async function updatePersonalizationSettings(
  patch: Partial<PersonalizationSettings>
): Promise<PersonalizationSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(PERSONALIZATION_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_PERSONALIZATION_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  await logPersonalization({
    actionType: "settings_update",
    status: "success",
    message: "Personalization settings updated",
    metadata: patch as Record<string, unknown>,
  });
  return getPersonalizationSettings();
}

export async function getUserPreferences(uid: string): Promise<UserPreferenceProfile> {
  const doc = await getAdminDb().collection("userPreferences").doc(uid).get();
  if (!doc.exists) {
    const def = defaultUserPreferences(uid);
    await getAdminDb().collection("userPreferences").doc(uid).set(def);
    return def;
  }
  const d = doc.data() as Record<string, unknown>;
  return {
    uid,
    preferredLanguage: (asString(d.preferredLanguage) === "en" ? "en" : "hi") as "hi" | "en",
    preferredCategories: dedupeStrings(d.preferredCategories),
    followedTopics: dedupeStrings(d.followedTopics),
    followedAuthors: dedupeStrings(d.followedAuthors),
    followedLocations: dedupeStrings(d.followedLocations),
    notificationPreferences: {
      breaking: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.breaking, true),
      followedCategories: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.followedCategories, true),
      followedTopics: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.followedTopics, true),
      followedAuthors: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.followedAuthors, true),
      dailyDigest: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.dailyDigest, false),
      weeklyDigest: toBool((d.notificationPreferences as Record<string, unknown> | undefined)?.weeklyDigest, false),
    },
    themePreference: (["light", "dark", "system"].includes(asString(d.themePreference))
      ? asString(d.themePreference)
      : "system") as "light" | "dark" | "system",
    fontPreference: (["small", "medium", "large"].includes(asString(d.fontPreference))
      ? asString(d.fontPreference)
      : "medium") as "small" | "medium" | "large",
    readingWidth: (["compact", "comfortable", "wide"].includes(asString(d.readingWidth))
      ? asString(d.readingWidth)
      : "comfortable") as "compact" | "comfortable" | "wide",
    compactMode: toBool(d.compactMode, false),
    personalizationEnabled: toBool(d.personalizationEnabled, true),
    updatedAt: asString(d.updatedAt || nowIso()),
  };
}

export async function updateUserPreferences(uid: string, patch: Partial<UserPreferenceProfile>) {
  const existing = await getUserPreferences(uid);
  const next = {
    ...existing,
    ...patch,
    preferredCategories: patch.preferredCategories ? dedupeStrings(patch.preferredCategories) : existing.preferredCategories,
    followedTopics: patch.followedTopics ? dedupeStrings(patch.followedTopics) : existing.followedTopics,
    followedAuthors: patch.followedAuthors ? dedupeStrings(patch.followedAuthors) : existing.followedAuthors,
    followedLocations: patch.followedLocations ? dedupeStrings(patch.followedLocations) : existing.followedLocations,
    updatedAt: nowIso(),
  };
  await getAdminDb().collection("userPreferences").doc(uid).set(next, { merge: true });
  await logPersonalization({
    uid,
    actionType: "preferences_update",
    status: "success",
    message: "User preferences updated",
  });
  return next;
}

export async function addReadingHistory(
  uid: string,
  payload: {
    articleId: string;
    readingTimeSec?: number;
    completed?: boolean;
    categoryId?: string;
    categoryName?: string;
    topicTags?: string[];
  }
) {
  if (!payload.articleId) throw new Error("articleId required");
  const item: UserReadingHistoryItem = {
    uid,
    articleId: payload.articleId,
    categoryId: payload.categoryId,
    categoryName: payload.categoryName,
    topicTags: payload.topicTags || [],
    viewedAt: nowIso(),
    readingTimeSec: Math.max(0, Number(payload.readingTimeSec || 0)),
    completed: Boolean(payload.completed),
    lastVisitedAt: nowIso(),
  };
  await getAdminDb().collection("userReadingHistory").add(item);
  await logPersonalization({
    uid,
    actionType: "history_add",
    status: "success",
    message: `History tracked for article ${payload.articleId}`,
  });
  return item;
}

export async function getReadingHistory(uid: string, limit = 40, offset = 0) {
  const snap = await getAdminDb()
    .collection("userReadingHistory")
    .where("uid", "==", uid)
    .orderBy("lastVisitedAt", "desc")
    .limit(Math.min(120, Math.max(1, limit + offset)))
    .get();
  const items: Record<string, unknown>[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  return items.slice(offset, offset + limit);
}

export async function upsertBookmark(uid: string, payload: Omit<UserBookmarkItem, "uid" | "createdAt">) {
  const existing = await getAdminDb()
    .collection("userBookmarks")
    .where("uid", "==", uid)
    .where("articleId", "==", payload.articleId)
    .limit(1)
    .get();
  if (!existing.empty) {
    return { id: existing.docs[0].id, ...(existing.docs[0].data() as Record<string, unknown>) };
  }
  const doc = await getAdminDb().collection("userBookmarks").add({
    uid,
    articleId: payload.articleId,
    title: payload.title,
    slug: payload.slug,
    categoryName: payload.categoryName || "",
    language: payload.language || "hi",
    createdAt: nowIso(),
  } as UserBookmarkItem);
  await logPersonalization({
    uid,
    actionType: "bookmark_add",
    status: "success",
    message: `Bookmarked ${payload.articleId}`,
  });
  return { id: doc.id };
}

export async function removeBookmark(uid: string, articleId: string) {
  const snap = await getAdminDb()
    .collection("userBookmarks")
    .where("uid", "==", uid)
    .where("articleId", "==", articleId)
    .limit(1)
    .get();
  if (snap.empty) return { removed: false };
  await snap.docs[0].ref.delete();
  await logPersonalization({
    uid,
    actionType: "bookmark_remove",
    status: "success",
    message: `Removed bookmark ${articleId}`,
  });
  return { removed: true };
}

export async function getBookmarks(
  uid: string,
  opts?: {
    query?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.min(120, Math.max(1, opts?.limit || 40));
  const offset = Math.max(0, opts?.offset || 0);
  const snap = await getAdminDb()
    .collection("userBookmarks")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit + offset)
    .get();
  let items: Record<string, unknown>[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
  if (opts?.query) {
    const q = opts.query.toLowerCase();
    items = items.filter((b) => `${asString(b.title)} ${asString(b.slug)}`.toLowerCase().includes(q));
  }
  if (opts?.category) {
    items = items.filter((b) => asString(b.categoryName) === opts.category);
  }
  return items.slice(offset, offset + limit);
}

export async function getFollows(uid: string): Promise<UserFollow> {
  const doc = await getAdminDb().collection("userFollows").doc(uid).get();
  if (!doc.exists) {
    const def: UserFollow = {
      uid,
      categories: [],
      topics: [],
      authors: [],
      locations: [],
      updatedAt: nowIso(),
    };
    await getAdminDb().collection("userFollows").doc(uid).set(def);
    return def;
  }
  const d = doc.data() as Record<string, unknown>;
  return {
    uid,
    categories: dedupeStrings(d.categories),
    topics: dedupeStrings(d.topics),
    authors: dedupeStrings(d.authors),
    locations: dedupeStrings(d.locations),
    updatedAt: asString(d.updatedAt || nowIso()),
  };
}

export async function updateFollows(
  uid: string,
  payload: {
    target: "categories" | "topics" | "authors" | "locations";
    action: "follow" | "unfollow";
    value: string;
  }
) {
  const follows = await getFollows(uid);
  const set = new Set(follows[payload.target]);
  if (payload.action === "follow") set.add(payload.value);
  else set.delete(payload.value);
  follows[payload.target] = [...set];
  follows.updatedAt = nowIso();
  await getAdminDb().collection("userFollows").doc(uid).set(follows, { merge: true });
  await logPersonalization({
    uid,
    actionType: "follow_update",
    status: "success",
    message: `${payload.action} ${payload.target}:${payload.value}`,
  });
  return follows;
}

async function getRecentPublishedNews(limit = 200): Promise<NewsDoc[]> {
  const snap = await getAdminDb()
    .collection("news")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

function scoreArticleForUser(article: NewsDoc, signals: {
  preferredLanguage?: "hi" | "en";
  preferredCategories: Set<string>;
  followedTopics: Set<string>;
  followedAuthors: Set<string>;
  followedLocations: Set<string>;
  seenArticles: Set<string>;
  bookmarkedArticles: Set<string>;
}): { score: number; reasons: string[] } {
  let score = 10;
  const reasons: string[] = [];
  const catId = asString(article.categoryId);
  const author = asString(article.author);
  const tags = Array.isArray(article.tags) ? (article.tags as string[]).map((x) => x.toLowerCase()) : [];
  const title = `${asString(article.titleEn)} ${asString(article.titleHi)}`.toLowerCase();
  const summary = `${asString(article.summaryEn)} ${asString(article.summaryHi)}`.toLowerCase();
  const textBlob = `${title} ${summary}`;

  if (signals.seenArticles.has(article.id)) score -= 25;
  if (signals.bookmarkedArticles.has(article.id)) score -= 30;
  if (signals.preferredCategories.has(catId)) {
    score += 22;
    reasons.push("Latest in followed categories");
  }
  if (signals.followedAuthors.has(author)) {
    score += 20;
    reasons.push("Latest from followed authors");
  }
  const topicHit = tags.some((t) => signals.followedTopics.has(t));
  if (topicHit) {
    score += 18;
    reasons.push("Trending in your interests");
  }
  const locationHit = [...signals.followedLocations].some((l) => textBlob.includes(l.toLowerCase()));
  if (locationHit) {
    score += 14;
    reasons.push("Related to followed locations");
  }
  if (signals.preferredLanguage === "hi" && asString(article.language) === "hi") score += 8;
  if (signals.preferredLanguage === "en" && asString(article.language) === "en") score += 8;

  const views = Number(article.views || 0);
  score += Math.min(12, Math.floor(views / 80));
  if (Boolean(article.isBreaking)) score += 8;
  if (Boolean(article.isFeatured)) score += 6;
  if (Boolean(article.isTrending)) score += 10;
  return { score: clamp(score), reasons };
}

export async function generateRecommendations(uid: string) {
  const [settings, prefs, follows, history, bookmarks, news] = await Promise.all([
    getPersonalizationSettings(),
    getUserPreferences(uid),
    getFollows(uid),
    getReadingHistory(uid, 120, 0),
    getBookmarks(uid, { limit: 200 }),
    getRecentPublishedNews(220),
  ]);
  if (!settings.enabled || !prefs.personalizationEnabled) {
    return { personalized: false, recommendations: [], reason: "Personalization disabled" };
  }

  const seen = new Set(history.map((h) => asString(h.articleId)));
  const bookmarked = new Set(bookmarks.map((b) => asString(b.articleId)));
  const signals = {
    preferredLanguage: prefs.preferredLanguage,
    preferredCategories: new Set([...prefs.preferredCategories, ...follows.categories]),
    followedTopics: new Set([...prefs.followedTopics, ...follows.topics].map((t) => t.toLowerCase())),
    followedAuthors: new Set([...prefs.followedAuthors, ...follows.authors]),
    followedLocations: new Set([...prefs.followedLocations, ...follows.locations]),
    seenArticles: seen,
    bookmarkedArticles: bookmarked,
  };

  const scored = news
    .map((article) => {
      const { score, reasons } = scoreArticleForUser(article, signals);
      return { article, score, reasons };
    })
    .filter((x) => x.score > 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.maxRecommendations);

  const existingSnap = await getAdminDb()
    .collection("personalizedRecommendations")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();
  const existingByArticle = new Map<string, { id: string; clicked?: boolean }>();
  existingSnap.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    existingByArticle.set(asString(data.articleId), { id: d.id, clicked: Boolean(data.clicked) });
  });

  const writes: Promise<unknown>[] = [];
  const recommendations: PersonalizedRecommendation[] = scored.map((x) => {
    const reason = x.reasons[0] || "Recommended for you";
    const rec: PersonalizedRecommendation = {
      uid,
      articleId: x.article.id,
      reason,
      score: x.score,
      sourceSignals: x.reasons.length ? x.reasons : ["Recommended for you"],
      createdAt: nowIso(),
      clicked: false,
    };
    const existing = existingByArticle.get(x.article.id);
    if (!existing) {
      writes.push(getAdminDb().collection("personalizedRecommendations").add(rec));
    }
    return rec;
  });

  if (writes.length) await Promise.all(writes);
  await logPersonalization({
    uid,
    actionType: "recommendations_refresh",
    status: "success",
    message: `Generated ${recommendations.length} recommendations`,
  });
  return {
    personalized: true,
    recommendations,
    sections: {
      recommendedForYou: recommendations.slice(0, 10),
      continueReading: history.filter((h) => !Boolean(h.completed)).slice(0, 8),
      recentlyViewed: history.slice(0, 8),
      becauseYouRead: recommendations.slice(10, 16),
      latestInFollowedCategories: recommendations.filter((r) => r.reason.includes("categories")).slice(0, 8),
      latestFromFollowedAuthors: recommendations.filter((r) => r.reason.includes("authors")).slice(0, 8),
      trendingInYourInterests: recommendations.filter((r) => r.reason.includes("interests")).slice(0, 8),
      editorsPicks: news.filter((n) => Boolean(n.isFeatured)).slice(0, 8),
      breakingNews: news.filter((n) => Boolean(n.isBreaking)).slice(0, 8),
    },
  };
}

export async function markRecommendationClick(uid: string, articleId: string) {
  const snap = await getAdminDb()
    .collection("personalizedRecommendations")
    .where("uid", "==", uid)
    .where("articleId", "==", articleId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return { updated: false };
  await snap.docs[0].ref.update({ clicked: true, clickedAt: nowIso() });
  return { updated: true };
}

export async function generateDigest(uid: string, digestType: UserDigest["digestType"]) {
  const rec = await generateRecommendations(uid);
  const recList = rec.recommendations.slice(0, 8);
  const articleIds = recList.map((r) => r.articleId);
  const titles = await Promise.all(
    articleIds.map(async (id) => {
      const doc = await getAdminDb().collection("news").doc(id).get();
      const data = doc.data() || {};
      return asString(data.titleEn || data.titleHi || "");
    })
  );
  const digest: Omit<UserDigest, "id"> = {
    uid,
    digestType,
    articleIds,
    title: `${digestType[0].toUpperCase()}${digestType.slice(1)} Digest`,
    summary: titles.filter(Boolean).map((t, i) => `${i + 1}. ${t}`).join("\n"),
    createdAt: nowIso(),
  };
  const ref = await getAdminDb().collection("userDigests").add(digest);
  await logPersonalization({
    uid,
    actionType: "digest_generate",
    status: "success",
    message: `${digestType} digest generated`,
  });
  return { id: ref.id, ...digest };
}

export async function getDigests(uid: string, limit = 20) {
  const snap = await getAdminDb()
    .collection("userDigests")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(Math.min(60, Math.max(1, limit)))
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as Record<string, unknown>[];
}

export async function getPersonalizationAdminDashboard(): Promise<PersonalizationAdminDashboard> {
  const [recs, bookmarks, follows, digests, logs] = await Promise.all([
    getAdminDb().collection("personalizedRecommendations").limit(2000).get(),
    getAdminDb().collection("userBookmarks").limit(2000).get(),
    getAdminDb().collection("userFollows").limit(1000).get(),
    getAdminDb().collection("userDigests").limit(1000).get(),
    getAdminDb().collection("personalizationLogs").orderBy("createdAt", "desc").limit(100).get(),
  ]);
  const recDocs = recs.docs.map((d) => d.data() as Record<string, unknown>);
  const recommendationUsage = recDocs.length;
  const recClicks = recDocs.filter((d) => Boolean(d.clicked)).length;
  const recommendationCtr = recClicks && recommendationUsage ? Number(((recClicks / recommendationUsage) * 100).toFixed(2)) : 0;

  const categoryCounter = new Map<string, number>();
  const topicCounter = new Map<string, number>();
  let followCategory = 0;
  let followTopic = 0;
  let followAuthor = 0;
  let followLocation = 0;
  let notificationSubscriptions = 0;
  follows.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const categories = dedupeStrings(data.categories);
    const topics = dedupeStrings(data.topics);
    const authors = dedupeStrings(data.authors);
    const locations = dedupeStrings(data.locations);
    followCategory += categories.length;
    followTopic += topics.length;
    followAuthor += authors.length;
    followLocation += locations.length;
    categories.forEach((c) => categoryCounter.set(c, (categoryCounter.get(c) || 0) + 1));
    topics.forEach((t) => topicCounter.set(t, (topicCounter.get(t) || 0) + 1));
  });
  const prefsSnap = await getAdminDb().collection("userPreferences").limit(1000).get();
  prefsSnap.docs.forEach((d) => {
    const n = (d.data().notificationPreferences || {}) as Record<string, unknown>;
    const anyOn = Object.values(n).some((v) => Boolean(v));
    if (anyOn) notificationSubscriptions += 1;
  });
  return {
    recommendationUsage,
    bookmarksCount: bookmarks.size,
    followCounts: {
      categories: followCategory,
      topics: followTopic,
      authors: followAuthor,
      locations: followLocation,
    },
    notificationSubscriptions,
    digestSubscribers: new Set(digests.docs.map((d) => asString(d.data().uid))).size,
    mostFollowedCategories: [...categoryCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count })),
    mostFollowedTopics: [...topicCounter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count })),
    recommendationCtr,
    logs: logs.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
  };
}
