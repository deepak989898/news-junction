"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Mail, RefreshCw, Send } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { fetchNewsletterAdmin, sendNewsletterDigestApi } from "@/lib/newsletter/client-api";

type SubRow = {
  id: string;
  email: string;
  status: string;
  language: string;
  source: string;
  createdAt: string;
};

type LogRow = {
  id: string;
  subject?: string;
  type?: string;
  sent?: number;
  failed?: number;
  attempted?: number;
  createdAt?: string;
  errors?: string[];
};

export default function NewsletterAdminPage() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [counts, setCounts] = useState({ active: 0, unsubscribed: 0, total: 0 });
  const [subscribers, setSubscribers] = useState<SubRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [subject, setSubject] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNewsletterAdmin();
      setConfigured(Boolean(data.config?.configured));
      setCounts(data.counts || { active: 0, unsubscribed: 0, total: 0 });
      setSubscribers((data.subscribers as SubRow[]) || []);
      setLogs((data.logs as LogRow[]) || []);
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

  const sendAll = async () => {
    setSending(true);
    try {
      const res = await sendNewsletterDigestApi({
        action: "send",
        subject: subject.trim() || undefined,
        language: "hi",
      });
      const result = res.result as { sent?: number; attempted?: number; errors?: string[] };
      toast.success(`Newsletter sent: ${result.sent || 0}/${result.attempted || 0}`);
      if (result.errors?.length) toast.error(result.errors[0]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter a test email");
      return;
    }
    setSending(true);
    try {
      const res = await sendNewsletterDigestApi({
        action: "test",
        testEmail: testEmail.trim(),
        subject: subject.trim() || undefined,
      });
      const result = res.result as { sent?: number; errors?: string[] };
      if (result.sent) toast.success("Test email sent");
      else toast.error(result.errors?.[0] || "Test send failed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "editor"]}>
      <AdminTopbar title="Newsletter" />
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-gray-600">
            Public signup is in the website footer. Delivery uses Resend (
            <code>RESEND_API_KEY</code> + <code>NEWSLETTER_FROM_EMAIL</code>).
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
            <div className="mb-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Provider</p>
                <p className="mt-1 text-lg font-bold text-[#1a2b4c]">
                  {configured ? "Resend ready" : "Not configured"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Active</p>
                <p className="mt-1 text-2xl font-bold text-[#1a2b4c]">{counts.active}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Unsubscribed</p>
                <p className="mt-1 text-2xl font-bold text-[#1a2b4c]">{counts.unsubscribed}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-[#1a2b4c]">{counts.total}</p>
              </div>
            </div>

            {!configured ? (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Set on Vercel: <code>RESEND_API_KEY</code> and <code>NEWSLETTER_FROM_EMAIL</code>{" "}
                (verified domain/sender in Resend). Optional:{" "}
                <code>NEWSLETTER_FROM_NAME</code>, <code>NEWSLETTER_REPLY_TO</code>.
              </div>
            ) : null}

            <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1a2b4c]">
                <Mail size={18} /> Send digest
              </h2>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Optional custom subject"
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sending || !configured}
                  onClick={sendAll}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a3181a] disabled:opacity-60"
                >
                  <Send size={14} /> {sending ? "Sending…" : `Send to ${counts.active} subscribers`}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                <div className="min-w-[220px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Test email</label>
                  <input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={sending || !configured}
                  onClick={sendTest}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Send test
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-[#1a2b4c]">Recent subscribers</h2>
                {subscribers.length === 0 ? (
                  <p className="text-sm text-gray-500">No subscribers yet. Use the website footer form.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {subscribers.map((s) => (
                      <li key={s.id} className="flex justify-between gap-2 py-2">
                        <span className="truncate font-medium text-[#1a2b4c]">{s.email}</span>
                        <span className="shrink-0 text-xs text-gray-500">
                          {s.status} · {s.language}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-[#1a2b4c]">Send logs</h2>
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">No newsletter sends yet.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {logs.map((log) => (
                      <li key={log.id} className="py-2">
                        <div className="font-semibold text-[#1a2b4c]">{log.subject || log.type}</div>
                        <div className="text-xs text-gray-500">
                          {log.type} · sent {log.sent ?? 0}/{log.attempted ?? 0}
                          {log.createdAt ? ` · ${new Date(log.createdAt).toLocaleString("en-IN")}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
