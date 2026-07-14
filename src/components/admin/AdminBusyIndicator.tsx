"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getAdminBusyState,
  installAdminFetchBusyTracker,
  subscribeAdminBusy,
} from "@/lib/admin/busy-store";

/**
 * Global top progress bar + blocking overlay for write/process API calls.
 * Installs a fetch tracker so all /api requests from admin show feedback.
 */
export default function AdminBusyIndicator() {
  const [state, setState] = useState(getAdminBusyState);

  useEffect(() => {
    installAdminFetchBusyTracker();
    return subscribeAdminBusy(setState);
  }, []);

  const busy = state.count > 0;
  const blocking = state.writeCount > 0;

  if (!busy) return null;

  return (
    <>
      {/* Indeterminate top progress bar */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[250] h-1 overflow-hidden bg-[#1a2b4c]/15"
        role="progressbar"
        aria-valuetext={state.label}
        aria-busy="true"
      >
        <div className="admin-progress-bar h-full w-1/3 bg-[#c41e20]" />
      </div>

      {/* Soft chip while only loading data */}
      {!blocking && (
        <div className="pointer-events-none fixed right-3 top-3 z-[250] flex items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#1a2b4c] shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c41e20]" />
          {state.label}
        </div>
      )}

      {/* Block interaction during generate / process / publish */}
      {blocking && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="admin-progress-bar h-full w-1/2 bg-[#c41e20]" />
            </div>
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#c41e20]" />
              <div>
                <p className="text-sm font-bold text-[#1a2b4c]">Please wait</p>
                <p className="mt-0.5 text-xs text-gray-600">{state.label}</p>
                <p className="mt-2 text-[11px] text-gray-400">
                  Do not close or click again until this finishes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
