"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, ExternalLink, Save, RefreshCw } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  fetchSubmissions,
  updateSubmission,
  type SubmissionRow,
  type SubmissionCounts,
} from "@/lib/trust/client-api";
import { CONTACT_CATEGORIES, type ContactStatus } from "@/lib/trust/types";

const STATUSES: { value: ContactStatus | "all"; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const STATUS_OPTIONS: ContactStatus[] = ["new", "in-progress", "resolved", "archived"];

function catLabel(v: string): string {
  return CONTACT_CATEGORIES.find((c) => c.value === v)?.labelEn || v;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export default function InboxPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [counts, setCounts] = useState<SubmissionCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("new");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<SubmissionRow | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchSubmissions({
        status: statusFilter === "all" ? "" : statusFilter,
        category: categoryFilter,
      });
      setRows(r.submissions);
      setCounts(r.counts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    // Legitimate data fetch when filters change; load() sets a loading flag.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openDetail = (row: SubmissionRow) => {
    setSelected(row);
    setNotes(row.internalNotes || "");
  };

  const changeStatus = async (row: SubmissionRow, status: ContactStatus) => {
    try {
      await updateSubmission(row.id, { status });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      if (selected?.id === row.id) setSelected({ ...selected, status });
      toast.success(`Marked ${status}.`);
      // Refresh counts.
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await updateSubmission(selected.id, { internalNotes: notes });
      setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, internalNotes: notes } : r)));
      toast.success("Notes saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <RoleGuard>
      <AdminTopbar title="Contact Inbox" />

      <div className="mb-3 flex items-center justify-between">
        <Link href="/admin/trust" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#1a2b4c]">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-[#1a2b4c] hover:text-[#1a2b4c]"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === s.value ? "bg-[#1a2b4c] text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {s.label}
            {counts && s.value !== "all" ? (
              <span className="ml-1 text-xs opacity-70">({counts[s.value]})</span>
            ) : null}
          </button>
        ))}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.labelEn}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* List */}
          <div className="lg:col-span-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                No submissions.
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => openDetail(r)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selected?.id === r.id
                          ? "border-[#1a2b4c] bg-[#1a2b4c]/5"
                          : "border-gray-100 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-[#1a2b4c]">{r.subject || "(no subject)"}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        {r.name} · {catLabel(r.category)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">{fmt(r.createdAt)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a2b4c]">{selected.subject || "(no subject)"}</h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {catLabel(selected.category)} · {fmt(selected.createdAt)} · {selected.language.toUpperCase()}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-gray-400">Name</dt>
                    <dd className="text-gray-800">{selected.name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-gray-400">Email</dt>
                    <dd>
                      <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 text-[#1a2b4c] hover:text-[#c41e20]">
                        <Mail size={13} /> {selected.email}
                      </a>
                    </dd>
                  </div>
                  {selected.phone ? (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-gray-400">Phone</dt>
                      <dd className="text-gray-800">{selected.phone}</dd>
                    </div>
                  ) : null}
                  {selected.articleUrl ? (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-gray-400">Article</dt>
                      <dd>
                        <a
                          href={selected.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 break-all text-[#c41e20] hover:underline"
                        >
                          <ExternalLink size={13} /> {selected.articleUrl}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Message</h3>
                  <p className="mt-1 whitespace-pre-line rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                    {selected.message}
                  </p>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Status</h3>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((st) => (
                      <button
                        key={st}
                        onClick={() => changeStatus(selected, st)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selected.status === st
                            ? "bg-[#1a2b4c] text-white"
                            : "border border-gray-200 text-gray-600 hover:border-[#1a2b4c]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Internal notes</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1.5 min-h-[90px] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]"
                    placeholder="Private notes for the team (not shown to the user)…"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Tip: public submissions never auto-change article content.
                    </p>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#c41e20] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                    >
                      <Save size={13} /> {savingNotes ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                Select a submission to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </RoleGuard>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case "new":
      return "bg-[#c41e20]/10 text-[#c41e20]";
    case "in-progress":
      return "bg-amber-100 text-amber-700";
    case "resolved":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-200 text-gray-600";
  }
}
