import { auth } from "@/firebase/auth";
import { env } from "@/config/env";

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function apiFetch<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth: requireAuth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requireAuth) {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");
    headers.Authorization = `Bearer ${token}`;
  }
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}
