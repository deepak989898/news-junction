"use client";

import { getAuthToken } from "@/lib/automation/client-api";

async function callOps<T>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(data.error || "Operations request failed");
  return data as T;
}

export const getOpsHealthApi = (force = false) => callOps(`/api/operations/health${force ? "?force=1" : ""}`);
export const getOpsQueuesApi = (service?: string, q?: string) =>
  callOps(`/api/operations/queues${service || q ? `?service=${encodeURIComponent(service || "")}&q=${encodeURIComponent(q || "")}` : ""}`);
export const queueActionApi = (payload: Record<string, unknown>) => callOps("/api/operations/queues", "POST", payload);
export const getOpsCronApi = () => callOps("/api/operations/cron");
export const cronActionApi = (payload: Record<string, unknown>) => callOps("/api/operations/cron", "POST", payload);
export const getOpsErrorsApi = () => callOps("/api/operations/errors");
export const retryActionApi = (payload: Record<string, unknown>) => callOps("/api/operations/retry", "POST", payload);
export const getOpsLogsApi = (limit = 200) => callOps(`/api/operations/logs?limit=${limit}`);
export const getOpsSettingsApi = () => callOps("/api/operations/logs", "POST");
export const updateMaintenanceModeApi = (payload: Record<string, unknown>) => callOps("/api/operations/logs", "PUT", payload);
export const getOpsCostApi = () => callOps("/api/operations/cost");
export const getOpsAlertsApi = () => callOps("/api/operations/alerts");
export const alertActionApi = (payload: Record<string, unknown>) => callOps("/api/operations/alerts", "POST", payload);
