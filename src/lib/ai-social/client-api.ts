"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callSocialApi<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Social API request failed");
  return data as T;
}

export const getSocialDashboardApi = () => callSocialApi("/api/ai/social/dashboard");
export const getSocialSettingsApi = () => callSocialApi("/api/ai/social/settings");
export const updateSocialSettingsApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/settings", "PUT", payload);
export const connectSocialAccountApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/accounts", "POST", payload);
export const disconnectSocialAccountApi = (platform: string) =>
  callSocialApi("/api/ai/social/accounts", "PUT", { platform, action: "disconnect" });
export const getSocialOAuthConfigApi = () =>
  callSocialApi<{ platforms: Array<Record<string, unknown>> }>("/api/ai/social/oauth/config");
export const startFacebookOAuthApi = () =>
  callSocialApi<{
    url: string;
    redirectUri: string;
    appId?: string;
    usingConfigId?: boolean;
    configIdPreview?: string | null;
  }>("/api/ai/social/oauth/facebook/start");
export const getFacebookSetupApi = () =>
  callSocialApi<Record<string, unknown>>("/api/ai/social/oauth/facebook/setup");
export const connectTelegramBotApi = (botToken: string) =>
  callSocialApi<{ success: boolean; accountName: string; channelTitle: string }>(
    "/api/ai/social/oauth/telegram/connect",
    "POST",
    { botToken }
  );
export const generateSocialContentApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/generate", "POST", payload);
export const scheduleSocialPostApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/schedule", "POST", payload);
export const processSocialQueueApi = (payload?: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/process-queue", "POST", payload || {});
export const bulkSocialActionApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/bulk", "POST", payload);
export const upsertSocialTemplateApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/templates", "PUT", payload);
export const createCampaignApi = (payload: Record<string, unknown>) =>
  callSocialApi("/api/ai/social/campaigns", "POST", payload);
