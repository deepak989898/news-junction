"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callPersonalizationApi<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Personalization request failed");
  return data as T;
}

export const getRecommendationsApi = () => callPersonalizationApi("/api/personalization/recommendations");
export const refreshRecommendationsApi = () =>
  callPersonalizationApi("/api/personalization/recommendations", "POST", { action: "refresh" });
export const markRecommendationClickApi = (articleId: string) =>
  callPersonalizationApi("/api/personalization/recommendations", "POST", { action: "click", articleId });

export const getBookmarksApi = (query?: string, category?: string) =>
  callPersonalizationApi(`/api/personalization/bookmarks${query || category ? `?query=${encodeURIComponent(query || "")}&category=${encodeURIComponent(category || "")}` : ""}`);
export const addBookmarkApi = (payload: Record<string, unknown>) =>
  callPersonalizationApi("/api/personalization/bookmarks", "POST", payload);
export const removeBookmarkApi = (articleId: string) =>
  callPersonalizationApi("/api/personalization/bookmarks", "DELETE", { articleId });

export const getFollowApi = () => callPersonalizationApi("/api/personalization/follow");
export const updateFollowApi = (payload: Record<string, unknown>) =>
  callPersonalizationApi("/api/personalization/follow", "POST", payload);

export const getDigestApi = () => callPersonalizationApi("/api/personalization/digest");
export const generateDigestApi = (digestType: string) =>
  callPersonalizationApi("/api/personalization/digest", "POST", { digestType });

export const getPreferencesApi = () => callPersonalizationApi("/api/personalization/preferences");
export const updatePreferencesApi = (payload: Record<string, unknown>) =>
  callPersonalizationApi("/api/personalization/preferences", "PUT", payload);

export const getHistoryApi = (limit = 40, offset = 0) =>
  callPersonalizationApi(`/api/personalization/history?limit=${limit}&offset=${offset}`);
export const addHistoryApi = (payload: Record<string, unknown>) =>
  callPersonalizationApi("/api/personalization/history", "POST", payload);

export const getPersonalizationSettingsApi = () => callPersonalizationApi("/api/personalization/settings");
export const updatePersonalizationSettingsApi = (payload: Record<string, unknown>) =>
  callPersonalizationApi("/api/personalization/settings", "PUT", payload);
export const getPersonalizationAdminDashboardApi = () => callPersonalizationApi("/api/personalization/admin-dashboard");
