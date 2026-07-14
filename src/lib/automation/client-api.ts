"use client";

import { getAuthInstance } from "@/firebase/auth";
import { parseApiResponse } from "@/lib/api/parse-response";

export async function getAuthToken(): Promise<string | null> {
  const user = getAuthInstance().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function adminApiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated. Please login again.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseApiResponse<{ error?: string } & T>(res);
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface ProcessBatchResult {
  success: boolean;
  processed: number;
  published: number;
  pending: number;
  failed: number;
  duplicates: number;
  batchSize?: number;
}

export async function approveRawNews(rawNewsId: string) {
  return adminApiPost("/api/automation/approve", { rawNewsId });
}

export async function rejectRawNewsApi(rawNewsId: string, reason?: string) {
  return adminApiPost("/api/automation/reject", { rawNewsId, reason });
}

export async function bulkRejectRawNews(rawNewsIds: string[], reason?: string) {
  return adminApiPost<{ processed: number; failed: number }>("/api/automation/bulk", {
    action: "reject",
    rawNewsIds,
    reason,
  });
}

export async function bulkDeleteRawNews(rawNewsIds: string[]) {
  return adminApiPost<{ deleted: number }>("/api/automation/bulk", {
    action: "delete",
    rawNewsIds,
  });
}

export async function bulkApproveRawNews(
  rawNewsIds: string[],
  onProgress?: (done: number, total: number) => void
) {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < rawNewsIds.length; i++) {
    try {
      await approveRawNews(rawNewsIds[i]);
      success++;
    } catch (error) {
      failed++;
      errors.push(error instanceof Error ? error.message : `Failed: ${rawNewsIds[i]}`);
    }
    onProgress?.(i + 1, rawNewsIds.length);
  }

  return { success, failed, errors };
}

export async function triggerAutomation(action: "fetch" | "process", batchSize = 1) {
  return adminApiPost<ProcessBatchResult>("/api/automation/trigger", { action, batchSize });
}

export async function regenerateArticleImageApi(
  newsId: string,
  overrides?: {
    titleEn?: string;
    titleHi?: string;
    summaryEn?: string;
    categoryId?: string;
  }
) {
  return adminApiPost<{ success: boolean; imageUrl: string; source: string }>(
    "/api/admin/news/regenerate-image",
    { newsId, ...overrides }
  );
}

export async function triggerProcessBatches(rounds = 3, batchSize = 1) {
  const totals = {
    processed: 0,
    published: 0,
    pending: 0,
    failed: 0,
    duplicates: 0,
    rounds: 0,
    timedOut: false,
    errors: [] as string[],
  };

  for (let i = 0; i < rounds; i++) {
    try {
      const result = await triggerAutomation("process", batchSize);
      totals.rounds++;
      totals.processed += result.processed || 0;
      totals.published += result.published || 0;
      totals.pending += result.pending || 0;
      totals.failed += result.failed || 0;
      totals.duplicates += result.duplicates || 0;
      if (!result.processed) break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      totals.errors.push(message);
      if (/timeout|FUNCTION_INVOCATION_TIMEOUT|504|524/i.test(message)) {
        totals.timedOut = true;
        break;
      }
      totals.failed += 1;
    }
  }

  return totals;
}
