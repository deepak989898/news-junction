"use client";

import { getAuthInstance } from "@/firebase/auth";
import { parseApiResponse } from "@/lib/api/parse-response";
import type {
  SitePage,
  SitePageKey,
  TrustConfig,
  Author,
  ContactStatus,
} from "@/lib/trust/types";
import type { PolicyGroup, EditPermission } from "@/lib/trust/page-config";

async function token(): Promise<string> {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Not authenticated. Please login again.");
  return user.getIdToken();
}

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const t = await token();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseApiResponse<{ error?: string } & T>(res);
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface PolicyPageSummary {
  key: SitePageKey;
  slug: string;
  path: string;
  titleEn: string;
  titleHi: string;
  group: PolicyGroup;
  editPermission: EditPermission;
  legalReview: boolean;
  published: boolean;
  version: number;
  lastUpdatedAt: string | null;
  saved: boolean;
}

export function fetchPolicyPages() {
  return call<{ pages: PolicyPageSummary[] }>("/api/admin/trust/pages", "GET");
}

export function fetchPolicyPage(key: SitePageKey) {
  return call<{ page: SitePage }>(`/api/admin/trust/pages?key=${encodeURIComponent(key)}`, "GET");
}

export function savePolicyPage(key: SitePageKey, page: SitePage) {
  return call<{ ok: boolean; page: SitePage }>("/api/admin/trust/pages", "PUT", { key, page });
}

export function fetchTrustConfig() {
  return call<{ config: TrustConfig; missing: string[] }>("/api/admin/trust/config", "GET");
}

export function saveTrustConfig(config: TrustConfig) {
  return call<{ ok: boolean; config: TrustConfig; missing: string[] }>(
    "/api/admin/trust/config",
    "PUT",
    { config }
  );
}

export function fetchAuthorsAdmin() {
  return call<{ authors: (Author & { id: string })[] }>("/api/admin/trust/authors", "GET");
}

export function createAuthor(data: Partial<Author>) {
  return call<{ ok: boolean; id: string; slug: string }>("/api/admin/trust/authors", "POST", data);
}

export function updateAuthor(data: Partial<Author> & { id: string }) {
  return call<{ ok: boolean; id: string; slug: string }>("/api/admin/trust/authors", "PUT", data);
}

export function deleteAuthor(id: string) {
  return call<{ ok: boolean }>(`/api/admin/trust/authors?id=${encodeURIComponent(id)}`, "DELETE");
}

export interface SubmissionRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  articleUrl: string;
  language: string;
  status: ContactStatus;
  internalNotes: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubmissionCounts {
  new: number;
  "in-progress": number;
  resolved: number;
  archived: number;
  total: number;
}

export function fetchSubmissions(filters?: { status?: string; category?: string }) {
  const q = new URLSearchParams();
  if (filters?.status) q.set("status", filters.status);
  if (filters?.category) q.set("category", filters.category);
  const qs = q.toString();
  return call<{ submissions: SubmissionRow[]; counts: SubmissionCounts }>(
    `/api/admin/trust/submissions${qs ? `?${qs}` : ""}`,
    "GET"
  );
}

export function updateSubmission(id: string, patch: { status?: ContactStatus; internalNotes?: string }) {
  return call<{ ok: boolean }>("/api/admin/trust/submissions", "PATCH", { id, ...patch });
}

export function deleteSubmission(id: string) {
  return call<{ ok: boolean }>(
    `/api/admin/trust/submissions?id=${encodeURIComponent(id)}`,
    "DELETE"
  );
}
