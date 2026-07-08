"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callSeoApi<T>(path: string, method: "GET" | "POST" | "PUT" = "POST", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "SEO API request failed");
  return data as T;
}

export const runSeoAuditApi = (articleId: string) =>
  callSeoApi("/api/ai/seo-audit", "POST", { articleId });
export const runSeoKeywordsApi = (articleId: string, topic?: string) =>
  callSeoApi("/api/ai/seo-keywords", "POST", { articleId, topic });
export const runSeoMetaApi = (articleId: string) =>
  callSeoApi("/api/ai/seo-meta", "POST", { articleId });
export const runSeoSlugApi = (articleId: string) =>
  callSeoApi("/api/ai/seo-slug", "POST", { articleId });
export const runSeoInternalLinksApi = (articleId: string) =>
  callSeoApi("/api/ai/seo-internal-links", "POST", { articleId });
export const runSeoFaqApi = (articleId: string) =>
  callSeoApi("/api/ai/seo-faq", "POST", { articleId });
export const runSeoContentGapApi = () => callSeoApi("/api/ai/seo-content-gap", "POST", {});
export const applySeoChangesApi = (payload: Record<string, unknown>) =>
  callSeoApi("/api/ai/seo-apply", "POST", payload);
export const getSeoDashboardApi = () => callSeoApi("/api/ai/seo-dashboard", "GET");
export const getSeoSettingsApi = () => callSeoApi("/api/ai/seo-settings", "GET");
export const updateSeoSettingsApi = (payload: Record<string, unknown>) =>
  callSeoApi("/api/ai/seo-settings", "PUT", payload);
