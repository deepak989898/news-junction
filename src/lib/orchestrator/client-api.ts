"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callOrchestrator<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Orchestrator request failed");
  return data as T;
}

export const getOrchestratorWorkflowsApi = () => callOrchestrator("/api/orchestrator/workflows");
export const saveOrchestratorWorkflowApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/workflows", "POST", payload);

export const getOrchestratorModulesApi = () => callOrchestrator("/api/orchestrator/modules");
export const toggleOrchestratorModuleApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/modules", "POST", payload);

export const emitOrchestratorEventApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/events", "POST", payload);

export const getOrchestratorJobsApi = (params?: { status?: string; priority?: string; workflowExecutionId?: string; q?: string }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.workflowExecutionId) q.set("workflowExecutionId", params.workflowExecutionId);
  if (params?.q) q.set("q", params.q);
  return callOrchestrator(`/api/orchestrator/jobs${q.toString() ? `?${q.toString()}` : ""}`);
};
export const updateOrchestratorJobApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/jobs", "POST", payload);

export const getOrchestratorHistoryApi = (params?: { status?: string; workflowId?: string; q?: string; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.workflowId) q.set("workflowId", params.workflowId);
  if (params?.q) q.set("q", params.q);
  if (Number.isFinite(Number(params?.limit))) q.set("limit", String(params?.limit));
  return callOrchestrator(`/api/orchestrator/history${q.toString() ? `?${q.toString()}` : ""}`);
};

export const getOrchestratorSettingsApi = () => callOrchestrator("/api/orchestrator/settings");
export const updateOrchestratorSettingsApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/settings", "PUT", payload);

export const emergencyOrchestratorActionApi = (payload: Record<string, unknown>) =>
  callOrchestrator("/api/orchestrator/emergency", "POST", payload);

export const getOrchestratorHealthApi = () => callOrchestrator("/api/orchestrator/health");
