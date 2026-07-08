import { apiFetch } from "./client";
import {
  PersonalizedRecommendation,
  UserBookmarkItem,
  UserPreferenceProfile,
  UserReadingHistoryItem,
} from "@/types/personalization";

export async function getRecommendationsApi() {
  return apiFetch<{ items: PersonalizedRecommendation[] }>("/api/personalization/recommendations");
}

export async function refreshRecommendationsApi() {
  return apiFetch("/api/personalization/recommendations", { method: "POST", body: { action: "refresh" } });
}

export async function markRecommendationClickApi(articleId: string) {
  return apiFetch("/api/personalization/recommendations", {
    method: "POST",
    body: { action: "click", articleId },
  });
}

export async function getBookmarksApi(query?: string, category?: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (category) params.set("category", category);
  const qs = params.toString();
  return apiFetch<{ items: UserBookmarkItem[] }>(`/api/personalization/bookmarks${qs ? `?${qs}` : ""}`);
}

export async function addBookmarkApi(payload: {
  articleId: string;
  title: string;
  slug: string;
  categoryName?: string;
  language?: "hi" | "en";
  folder?: string;
}) {
  return apiFetch<UserBookmarkItem>("/api/personalization/bookmarks", { method: "POST", body: payload });
}

export async function removeBookmarkApi(articleId: string) {
  return apiFetch("/api/personalization/bookmarks", { method: "DELETE", body: { articleId } });
}

export async function getHistoryApi(limit = 40, offset = 0) {
  return apiFetch<{ items: UserReadingHistoryItem[] }>(
    `/api/personalization/history?limit=${limit}&offset=${offset}`
  );
}

export async function addHistoryApi(payload: {
  articleId: string;
  categoryId?: string;
  categoryName?: string;
  readingTimeSec?: number;
  completed?: boolean;
  progress?: number;
}) {
  return apiFetch("/api/personalization/history", { method: "POST", body: payload });
}

export async function getPreferencesApi() {
  return apiFetch<UserPreferenceProfile>("/api/personalization/preferences");
}

export async function updatePreferencesApi(payload: Partial<UserPreferenceProfile>) {
  return apiFetch<UserPreferenceProfile>("/api/personalization/preferences", {
    method: "PUT",
    body: payload,
  });
}

export async function getFollowApi() {
  return apiFetch<{ categories: string[]; topics: string[]; authors: string[] }>("/api/personalization/follow");
}

export async function updateFollowApi(payload: { categories?: string[]; topics?: string[]; authors?: string[] }) {
  return apiFetch("/api/personalization/follow", { method: "POST", body: payload });
}

export async function getDigestApi() {
  return apiFetch("/api/personalization/digest");
}
