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

export async function approveRawNews(rawNewsId: string) {
  return adminApiPost("/api/automation/approve", { rawNewsId });
}

export async function rejectRawNewsApi(rawNewsId: string, reason?: string) {
  return adminApiPost("/api/automation/reject", { rawNewsId, reason });
}

export async function triggerAutomation(action: "fetch" | "process") {
  return adminApiPost("/api/automation/trigger", { action });
}
