import { apiFetch } from "./client";
import { AiActionMode, AiCenterResponse, AiChatMessage } from "@/types/ai";

export function getAiCenterApi() {
  return apiFetch<AiCenterResponse>("/api/mobile/ai/center");
}

export function askAssistantApi(payload: { prompt: string; language?: "hi" | "en" }) {
  return apiFetch<{ output: string; tokensUsed: number; chat: AiChatMessage }>("/api/mobile/ai/assistant", {
    method: "POST",
    body: payload,
  });
}

export function runAiActionApi(payload: { mode: AiActionMode; text: string; language?: "hi" | "en" }) {
  return apiFetch<{ output: string; tokensUsed: number }>("/api/mobile/ai/action", {
    method: "POST",
    body: payload,
  });
}

export function searchAiApi(query: string) {
  return apiFetch<{
    interpretedQuery: string;
    keywords: string[];
    suggestions: string[];
    related: Array<Record<string, unknown>>;
    tokensUsed: number;
  }>("/api/mobile/ai/search", { method: "POST", body: { query } });
}

export function getAiChatsApi(query?: string) {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return apiFetch<{ items: AiChatMessage[] }>(`/api/mobile/ai/chat-history${qs}`);
}

export function pinAiChatApi(chatId: string, pinned: boolean) {
  return apiFetch<{ updated: boolean }>("/api/mobile/ai/chat-history", {
    method: "PUT",
    body: { chatId, pinned },
  });
}

export function deleteAiChatApi(chatId: string) {
  return apiFetch<{ removed: boolean }>("/api/mobile/ai/chat-history", {
    method: "DELETE",
    body: { chatId },
  });
}
