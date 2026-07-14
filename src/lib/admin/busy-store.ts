"use client";

type BusyKind = "read" | "write";

type BusyState = {
  count: number;
  writeCount: number;
  label: string;
};

type Listener = (state: BusyState) => void;

const state: BusyState = {
  count: 0,
  writeCount: 0,
  label: "Working…",
};

const listeners = new Set<Listener>();

function emit() {
  const snapshot = { ...state };
  listeners.forEach((l) => l(snapshot));
}

export function subscribeAdminBusy(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export function getAdminBusyState(): BusyState {
  return { ...state };
}

export function beginAdminBusy(label = "Working…", kind: BusyKind = "write") {
  state.count += 1;
  if (kind === "write") state.writeCount += 1;
  if (label) state.label = label;
  emit();
}

export function endAdminBusy(kind: BusyKind = "write") {
  state.count = Math.max(0, state.count - 1);
  if (kind === "write") state.writeCount = Math.max(0, state.writeCount - 1);
  if (state.count === 0) {
    state.writeCount = 0;
    state.label = "Working…";
  }
  emit();
}

export async function runWithAdminBusy<T>(
  label: string,
  fn: () => Promise<T>,
  kind: BusyKind = "write"
): Promise<T> {
  beginAdminBusy(label, kind);
  try {
    return await fn();
  } finally {
    endAdminBusy(kind);
  }
}

function inferLabel(method: string, path: string): string {
  const m = method.toUpperCase();
  const p = path.toLowerCase();
  if (p.includes("generate") || p.includes("regenerate")) return "Generating… please wait";
  if (p.includes("process") || p.includes("approve") || p.includes("publish")) return "Processing… please wait";
  if (p.includes("fetch") || p.includes("research") || p.includes("sync")) return "Fetching / researching… please wait";
  if (p.includes("render") || p.includes("video") || p.includes("audio")) return "Rendering media… please wait";
  if (p.includes("upload") || p.includes("media")) return "Uploading / updating media…";
  if (p.includes("delete")) return "Deleting… please wait";
  if (m === "GET") return "Loading…";
  return "Working… please wait";
}

function shouldTrackAdminApi(url: string): boolean {
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, window.location.origin);
    if (u.origin !== window.location.origin) return false;
    if (!u.pathname.startsWith("/api/")) return false;
    // Skip noisy pure-auth probes if any
    if (u.pathname.startsWith("/api/auth")) return false;
    return true;
  } catch {
    return url.includes("/api/");
  }
}

let fetchPatched = false;

/** Patch window.fetch once so all admin API calls show progress automatically. */
export function installAdminFetchBusyTracker() {
  if (typeof window === "undefined" || fetchPatched) return;
  fetchPatched = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    const track = shouldTrackAdminApi(url);
    const kind: BusyKind = method === "GET" || method === "HEAD" ? "read" : "write";

    if (track) beginAdminBusy(inferLabel(method, url), kind);
    try {
      return await original(input, init);
    } finally {
      if (track) endAdminBusy(kind);
    }
  };
}
