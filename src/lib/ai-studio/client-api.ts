"use client";

import { getAuthToken } from "@/lib/automation/client-api";
import { ContentActionType, AIRiskReport, AIUsageStats } from "./types";

export async function runContentAction(params: {
  articleId: string;
  actionType: ContentActionType;
  language?: "hi" | "en" | "both";
  customInstruction?: string;
}) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/content-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI action failed");
  return data;
}

export async function runRiskCheck(articleId: string) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/risk-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ articleId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Risk check failed");
  return data as { report: AIRiskReport; tokensUsed: number; estimatedCost: number };
}

export async function applyAIContent(params: {
  articleId: string;
  field: string;
  newValue: string;
  actionType: string;
  saveAsDraft?: boolean;
  pendingChangeId?: string;
}) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/apply-content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Apply failed");
  return data;
}

export async function reviewPendingChange(params: {
  pendingChangeId: string;
  action: "approve" | "reject";
}) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/pending-review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Review failed");
  return data;
}

export async function fetchAIUsage(): Promise<AIUsageStats> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/usage", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load usage");
  return data;
}

export async function fetchAISettingsClient() {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/settings", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load settings");
  return data;
}

export async function updateAISettingsClient(settings: Record<string, unknown>) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/ai/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update settings");
  return data;
}
