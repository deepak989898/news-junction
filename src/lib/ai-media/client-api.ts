"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callMediaApi<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Media API request failed");
  return data as T;
}

export const getMediaStudioApi = () => callMediaApi("/api/ai/media/studio", "GET");
export const getMediaSettingsApi = () => callMediaApi("/api/ai/media/settings", "GET");
export const updateMediaSettingsApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/settings", "PUT", payload);
export const getBrandKitApi = () => callMediaApi("/api/ai/media/brand-kit", "GET");
export const updateBrandKitApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/brand-kit", "PUT", payload);
export const generateMediaApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/generate", "POST", payload);
export const enqueueMediaApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/enqueue", "POST", payload);
export const processQueueApi = (payload?: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/process-queue", "POST", payload || {});
export const getQueueApi = () => callMediaApi("/api/ai/media/queue", "GET");
export const updateQueueStatusApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/queue", "PUT", payload);
export const applyMediaApi = (payload: Record<string, unknown>) =>
  callMediaApi("/api/ai/media/apply", "POST", payload);
