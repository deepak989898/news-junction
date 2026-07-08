import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_KEY = "nj_recent_searches";
const LIKES_KEY = "nj_liked_articles";
const NOTIFICATIONS_KEY = "nj_notification_history";

export async function getRecentSearches() {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  if (!raw) return [] as string[];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = await getRecentSearches();
  const next = [trimmed, ...existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 12);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(RECENT_KEY);
}

export async function getLikedArticles(uid: string) {
  const raw = await AsyncStorage.getItem(`${LIKES_KEY}_${uid}`);
  if (!raw) return [] as string[];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function toggleArticleLike(uid: string, articleId: string) {
  const liked = await getLikedArticles(uid);
  const has = liked.includes(articleId);
  const next = has ? liked.filter((id) => id !== articleId) : [...liked, articleId];
  await AsyncStorage.setItem(`${LIKES_KEY}_${uid}`, JSON.stringify(next));
  return !has;
}

export async function getNotificationHistory() {
  const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as import("@/types/personalization").AppNotificationItem[];
  } catch {
    return [];
  }
}

export async function saveNotificationHistory(items: import("@/types/personalization").AppNotificationItem[]) {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 100)));
}
