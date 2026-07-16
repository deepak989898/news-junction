"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, RefreshCw, Send } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchPushAdmin, sendPushAdminApi } from "@/lib/newsletter/client-api";

type PushLog = {
  id: string;
  title?: string;
  body?: string;
  sent?: number;
  failed?: number;
  attempted?: number;
  createdAt?: string;
  errors?: string[];
};

export default function NotificationsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [tokenCount, setTokenCount] = useState(0);
  const [expoTokenCount, setExpoTokenCount] = useState(0);
  const [hasExpoAccessToken, setHasExpoAccessToken] = useState(false);
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPushAdmin();
      setTokenCount(Number(data.tokenCount || 0));
      setExpoTokenCount(Number(data.expoTokenCount || 0));
      setHasExpoAccessToken(Boolean(data.hasExpoAccessToken));
      setLogs((data.logs as PushLog[]) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSending(true);
    try {
      const res = await sendPushAdminApi({ title: title.trim(), body: body.trim(), type: "manual" });
      const result = res.result as { sent?: number; failed?: number; attempted?: number; errors?: string[] };
      toast.success(`Push sent: ${result.sent || 0} / ${result.attempted || 0}`);
      if (result.errors?.length) toast.error(result.errors[0]);
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "editor"]}>
      <AdminTopbar title="Push Notifications" />
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-gray-600">
            Expo push is sent automatically when articles are published. Use this page to send a
            manual notification to all registered app devices.
          </p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Registered tokens</p>
                <p className="mt-1 text-2xl font-bold text-[#1a2b4c]">{tokenCount}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Expo tokens</p>
                <p className="mt-1 text-2xl font-bold text-[#1a2b4c]">{expoTokenCount}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">EXPO_ACCESS_TOKEN</p>
                <p className="mt-1 text-lg font-semibold text-[#1a2b4c]">
                  {hasExpoAccessToken ? "Configured" : "Optional / not set"}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1a2b4c]">
                <Bell size={18} /> Send manual push
              </h2>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Message body"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={send}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a3181a] disabled:opacity-60"
                >
                  <Send size={14} /> {sending ? "Sending…" : "Send to all devices"}
                </button>
              </div>
              {tokenCount === 0 ? (
                <p className="mt-3 text-sm text-amber-700">
                  No device tokens yet. Open the mobile app while logged in so Expo can register a
                  push token in <code>userPushTokens</code>.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-[#1a2b4c]">Recent push logs</h2>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500">No push logs yet.</p>
              ) : (
                <ul className="divide-y">
                  {logs.map((log) => (
                    <li key={log.id} className="py-3 text-sm">
                      <div className="font-semibold text-[#1a2b4c]">{log.title || "Untitled"}</div>
                      <div className="text-gray-600">{log.body}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        sent {log.sent ?? 0}/{log.attempted ?? 0}
                        {log.failed ? ` · failed ${log.failed}` : ""}
                        {log.createdAt ? ` · ${new Date(log.createdAt).toLocaleString("en-IN")}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
