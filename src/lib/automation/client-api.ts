"use client";

import { getAuth } from "firebase/auth";

export async function getAuthToken(): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function approveRawNews(rawNewsId: string) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/automation/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawNewsId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Approve failed");
  return data;
}

export async function rejectRawNewsApi(rawNewsId: string, reason?: string) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/automation/reject", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rawNewsId, reason }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Reject failed");
  return data;
}

export async function triggerAutomation(action: "fetch" | "process") {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/api/automation/trigger", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Trigger failed");
  return data;
}
