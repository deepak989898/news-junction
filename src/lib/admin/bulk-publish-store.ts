"use client";

import { getAuthToken } from "@/lib/automation/client-api";

export type BulkPublishState = {
  running: boolean;
  total: number;
  done: number;
  published: number;
  failed: number;
  label: string;
  finishedAt: number | null;
};

type Listener = (state: BulkPublishState) => void;

const state: BulkPublishState = {
  running: false,
  total: 0,
  done: 0,
  published: 0,
  failed: 0,
  label: "",
  finishedAt: null,
};

const listeners = new Set<Listener>();
let cancelRequested = false;

function emit() {
  const snapshot = { ...state };
  listeners.forEach((l) => l(snapshot));
}

export function subscribeBulkPublish(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getBulkPublishState(): BulkPublishState {
  return { ...state };
}

export function isBulkPublishRunning(): boolean {
  return state.running;
}

export function cancelBulkPublish() {
  if (state.running) {
    cancelRequested = true;
    state.label = "Finishing current item, then stopping…";
    emit();
  }
}

async function backgroundPost(path: string, body: Record<string, unknown>) {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  // njBackground marker keeps the global blocking overlay from appearing.
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${path}${separator}njBackground=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as { success?: boolean; status?: string; newsId?: string; message?: string };
}

/**
 * Runs a non-blocking, background loop that generates & publishes each selected queue item
 * one at a time. Progress is broadcast to subscribers so a floating widget can show counts
 * while the admin keeps working elsewhere in the panel.
 */
export async function startBulkGeneratePublish(
  ids: string[],
  options?: { onItemDone?: (id: string, ok: boolean) => void; onComplete?: (state: BulkPublishState) => void }
): Promise<void> {
  if (state.running) throw new Error("A publish task is already running");
  if (!ids.length) return;

  cancelRequested = false;
  state.running = true;
  state.total = ids.length;
  state.done = 0;
  state.published = 0;
  state.failed = 0;
  state.finishedAt = null;
  state.label = "Generating & publishing…";
  emit();

  for (const id of ids) {
    if (cancelRequested) break;
    try {
      const res = await backgroundPost("/api/automation/generate-and-publish", { rawNewsId: id });
      if (res.status === "published" || res.newsId) {
        state.published += 1;
        options?.onItemDone?.(id, true);
      } else {
        state.failed += 1;
        options?.onItemDone?.(id, false);
      }
    } catch {
      state.failed += 1;
      options?.onItemDone?.(id, false);
    }
    state.done += 1;
    emit();
  }

  state.running = false;
  state.finishedAt = Date.now();
  state.label = cancelRequested
    ? `Stopped — ${state.published} published`
    : `Done — ${state.published} published${state.failed ? `, ${state.failed} failed` : ""}`;
  emit();
  options?.onComplete?.({ ...state });
}
