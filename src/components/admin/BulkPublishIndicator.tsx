"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, X } from "lucide-react";
import {
  BulkPublishState,
  cancelBulkPublish,
  getBulkPublishState,
  subscribeBulkPublish,
} from "@/lib/admin/bulk-publish-store";

/**
 * Small floating, non-blocking progress widget for the background bulk generate & publish task.
 * Stays mounted in the admin layout so it keeps showing while the admin navigates the panel.
 */
export default function BulkPublishIndicator() {
  const [state, setState] = useState<BulkPublishState>(getBulkPublishState);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeBulkPublish(setState), []);

  useEffect(() => {
    if (state.running) setDismissed(false);
  }, [state.running]);

  // Auto-hide the completed card after a short delay.
  useEffect(() => {
    if (!state.running && state.finishedAt) {
      const t = setTimeout(() => setDismissed(true), 12000);
      return () => clearTimeout(t);
    }
  }, [state.running, state.finishedAt]);

  const visible = (state.running || (!!state.finishedAt && !dismissed)) && state.total > 0;
  if (!visible) return null;

  const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-[260] w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {state.running ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#c41e20]" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span className="text-sm font-bold text-[#1a2b4c]">
            {state.running ? "Publishing in background" : "Bulk publish finished"}
          </span>
        </div>
        {!state.running && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          {state.done}/{state.total} processed
        </span>
        <span className="font-semibold text-green-700">{state.published} published</span>
      </div>
      {state.failed > 0 && (
        <p className="mt-1 text-xs text-amber-600">{state.failed} failed / retried</p>
      )}

      {state.running ? (
        <button
          type="button"
          onClick={cancelBulkPublish}
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Stop after current
        </button>
      ) : (
        <p className="mt-2 text-xs text-gray-500">{state.label}</p>
      )}
    </div>
  );
}
