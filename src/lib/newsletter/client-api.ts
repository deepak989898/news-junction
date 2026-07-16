import { getAuthToken } from "@/lib/automation/client-api";

async function authFetch(path: string, init?: RequestInit) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function fetchNewsletterAdmin() {
  return authFetch("/api/admin/newsletter");
}

export function sendNewsletterDigestApi(body: {
  action?: "send" | "test";
  subject?: string;
  language?: "hi" | "en";
  articleLimit?: number;
  testEmail?: string;
}) {
  return authFetch("/api/admin/newsletter", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchPushAdmin() {
  return authFetch("/api/admin/notifications");
}

export function sendPushAdminApi(body: {
  title: string;
  body: string;
  type?: string;
  slug?: string;
  url?: string;
}) {
  return authFetch("/api/admin/notifications", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
