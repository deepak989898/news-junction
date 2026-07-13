"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callVoiceVideoApi<T>(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Voice/Video API request failed");
  return data as T;
}

export const getVoiceVideoStudioApi = () => callVoiceVideoApi("/api/ai/voice-video-studio");
export const generateVoiceScriptApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/generate-voice-script", "POST", payload);
export const generateAudioApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/generate-audio", "POST", payload);
export const generateSubtitlesApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/generate-subtitles", "POST", payload);
export const generateVideoPackageApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/generate-video-package", "POST", payload);
export const renderVideoPackageApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/render-video-package", "POST", payload);
export const generateDigestApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/generate-digest", "POST", payload);
export const approveAudioVideoApi = (payload: Record<string, unknown>) =>
  callVoiceVideoApi("/api/ai/approve-audio-video", "POST", payload);
