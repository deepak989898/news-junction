"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callAnalyticsApi<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Analytics API request failed");
  return data as T;
}

export const getAnalyticsSummaryApi = (range: "today" | "7d" | "30d" = "7d") =>
  callAnalyticsApi(`/api/ai/analytics-summary?range=${range}`);
export const getGrowthInsightsApi = () => callAnalyticsApi("/api/ai/growth-insights");
export const getContentPerformanceApi = () => callAnalyticsApi("/api/ai/content-performance");
export const getTrendDiscoveryApi = () => callAnalyticsApi("/api/ai/trend-discovery");
export const getRevenueSummaryApi = () => callAnalyticsApi("/api/ai/revenue-summary");
export const generateReportApi = (payload: Record<string, unknown>) => callAnalyticsApi("/api/ai/report-generator", "POST", payload);
export const exportAnalyticsApi = (payload: Record<string, unknown>) => callAnalyticsApi("/api/ai/analytics-export", "POST", payload);
export const getAnalyticsSettingsApi = () => callAnalyticsApi("/api/ai/analytics-settings");
export const updateAnalyticsSettingsApi = (payload: Record<string, unknown>) =>
  callAnalyticsApi("/api/ai/analytics-settings", "PUT", payload);
