"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callEditorialApi<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Editorial API request failed");
  return data as T;
}

export const getEditorialDashboardApi = () => callEditorialApi("/api/ai/editorial-dashboard");
export const getEditorialSettingsApi = () => callEditorialApi("/api/ai/editorial-settings");
export const updateEditorialSettingsApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/editorial-settings", "PUT", payload);
export const runEditorialReviewApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/editorial-review", "POST", payload);
export const reviewHeadlineApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-headline", "POST", payload);
export const reviewSummaryApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-summary", "POST", payload);
export const reviewLanguageApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-language", "POST", payload);
export const reviewSeoApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-seo", "POST", payload);
export const reviewEntitiesApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-entities", "POST", payload);
export const reviewImageApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-image", "POST", payload);
export const reviewDuplicateApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/review-duplicate", "POST", payload);
export const applyEditorialReviewApi = (payload: Record<string, unknown>) =>
  callEditorialApi("/api/ai/apply-editorial-review", "POST", payload);
export const processEditorialQueueApi = (payload?: Record<string, unknown>) =>
  callEditorialApi("/api/ai/editorial-process-queue", "POST", payload || {});
