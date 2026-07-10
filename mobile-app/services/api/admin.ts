import { apiFetch } from "./client";
import { AdminDashboardMetrics } from "@/types/admin";

export async function getMyAdminProfileApi() {
  return apiFetch<{ profile: { uid: string; email?: string; name?: string; role: string; status?: string } }>(
    "/api/mobile/admin/profile"
  );
}

export async function getAdminDashboardApi() {
  return apiFetch<AdminDashboardMetrics>("/api/mobile/admin/dashboard");
}

export async function getAdminArticlesApi(params?: { status?: string; query?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.query) search.set("query", params.query);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<{ items: Array<Record<string, unknown>> }>(`/api/mobile/admin/articles${qs ? `?${qs}` : ""}`);
}

export async function updateAdminArticleStatusApi(payload: {
  articleId: string;
  status: "draft" | "published" | "archived" | "rejected";
}) {
  return apiFetch<{ updated: boolean }>("/api/mobile/admin/articles", { method: "PUT", body: payload });
}

export async function runAdminAiActionApi(payload: {
  articleId: string;
  actionType: string;
  language?: "hi" | "en" | "both";
  customInstruction?: string;
}) {
  return apiFetch<Record<string, unknown>>("/api/ai/content-action", { method: "POST", body: payload });
}

export async function getOperationsSnapshotApi() {
  const [health, queues, cron, cost, errors] = await Promise.all([
    apiFetch<Record<string, unknown>>("/api/operations/health"),
    apiFetch<Record<string, unknown>>("/api/operations/queues"),
    apiFetch<Record<string, unknown>>("/api/operations/cron"),
    apiFetch<Record<string, unknown>>("/api/operations/cost"),
    apiFetch<Record<string, unknown>>("/api/operations/errors"),
  ]);
  return { health, queues, cron, cost, errors };
}

export async function getOrchestratorSnapshotApi() {
  const [health, workflows, jobs, history] = await Promise.all([
    apiFetch<Record<string, unknown>>("/api/orchestrator/health"),
    apiFetch<Record<string, unknown>>("/api/orchestrator/workflows"),
    apiFetch<Record<string, unknown>>("/api/orchestrator/jobs"),
    apiFetch<Record<string, unknown>>("/api/orchestrator/history"),
  ]);
  return { health, workflows, jobs, history };
}

export async function runOrchestratorActionApi(payload: { action: string; workflowId?: string; queueName?: string }) {
  if (payload.action === "emergency_pause") {
    return apiFetch("/api/orchestrator/emergency", { method: "POST", body: { action: "pause" } });
  }
  if (payload.action === "emergency_resume") {
    return apiFetch("/api/orchestrator/emergency", { method: "POST", body: { action: "resume" } });
  }
  if (payload.action === "run_workflow" && payload.workflowId) {
    return apiFetch("/api/orchestrator/jobs", {
      method: "POST",
      body: { action: "run", workflowId: payload.workflowId },
    });
  }
  if (payload.action === "retry_failed" && payload.workflowId) {
    return apiFetch("/api/orchestrator/jobs", {
      method: "POST",
      body: { action: "retry", workflowId: payload.workflowId },
    });
  }
  return { ok: false };
}

export async function getAnalyticsSnapshotApi() {
  const [summary, usage, contentPerformance, trendDiscovery] = await Promise.all([
    apiFetch<Record<string, unknown>>("/api/ai/analytics-summary"),
    apiFetch<Record<string, unknown>>("/api/ai/usage"),
    apiFetch<Record<string, unknown>>("/api/ai/content-performance"),
    apiFetch<Record<string, unknown>>("/api/ai/trend-discovery"),
  ]);
  return { summary, usage, contentPerformance, trendDiscovery };
}

export async function getOperationsAlertsApi() {
  return apiFetch<Record<string, unknown>>("/api/operations/alerts");
}

export async function upsertOperationsAlertApi(payload: Record<string, unknown>) {
  return apiFetch<Record<string, unknown>>("/api/operations/alerts", { method: "POST", body: payload });
}

export async function getGlobalAdminSearchApi(query: string) {
  return apiFetch<{ results: Array<Record<string, unknown>> }>("/api/mobile/admin/search", {
    method: "POST",
    body: { query },
  });
}

export async function getAdminUsersApi() {
  return apiFetch<{ items: Array<Record<string, unknown>> }>("/api/mobile/admin/users");
}

export async function updateAdminUserApi(payload: Record<string, unknown>) {
  return apiFetch<Record<string, unknown>>("/api/mobile/admin/users", { method: "PUT", body: payload });
}
