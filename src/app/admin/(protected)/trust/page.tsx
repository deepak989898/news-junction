"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Users,
  Inbox,
  Building2,
  ExternalLink,
  Pencil,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPolicyPages,
  fetchTrustConfig,
  fetchSubmissions,
  type PolicyPageSummary,
} from "@/lib/trust/client-api";
import { POLICY_GROUP_LABELS, type PolicyGroup } from "@/lib/trust/page-config";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function TrustHubPage() {
  const { adminUser } = useAuth();
  const isSuper = adminUser?.role === "super_admin";
  const [pages, setPages] = useState<PolicyPageSummary[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, s] = await Promise.all([
          fetchPolicyPages(),
          fetchTrustConfig().catch(() => ({ config: null, missing: [] as string[] })),
          fetchSubmissions({ status: "new" }).catch(() => ({ counts: { new: 0 } as { new: number } })),
        ]);
        setPages(p.pages);
        setMissing(c.missing || []);
        setNewCount((s.counts as { new: number }).new || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const groups: Record<PolicyGroup, PolicyPageSummary[]> = { company: [], editorial: [], legal: [] };
  pages.forEach((p) => groups[p.group].push(p));

  return (
    <RoleGuard>
      <AdminTopbar title="Trust & Policies" />

      <div className="space-y-5">
        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/trust/config"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1a2b4c]/30"
          >
            <Building2 className="text-[#1a2b4c]" />
            <div>
              <div className="font-semibold text-[#1a2b4c]">Ownership & Contact</div>
              <div className="text-xs text-gray-500">Business, legal & contact details</div>
            </div>
          </Link>
          <Link
            href="/admin/trust/authors"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1a2b4c]/30"
          >
            <Users className="text-[#1a2b4c]" />
            <div>
              <div className="font-semibold text-[#1a2b4c]">Authors</div>
              <div className="text-xs text-gray-500">Manage author profiles</div>
            </div>
          </Link>
          <Link
            href="/admin/trust/inbox"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1a2b4c]/30"
          >
            <Inbox className="text-[#1a2b4c]" />
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#1a2b4c]">
                Contact Inbox
                {newCount > 0 ? (
                  <span className="rounded-full bg-[#c41e20] px-2 py-0.5 text-[10px] text-white">{newCount} new</span>
                ) : null}
              </div>
              <div className="text-xs text-gray-500">Submissions & correction requests</div>
            </div>
          </Link>
          <a
            href="/about-us"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#1a2b4c]/30"
          >
            <ShieldCheck className="text-[#1a2b4c]" />
            <div>
              <div className="flex items-center gap-1 font-semibold text-[#1a2b4c]">
                View public pages <ExternalLink size={12} />
              </div>
              <div className="text-xs text-gray-500">Open the live trust pages</div>
            </div>
          </a>
        </div>

        {/* Completion checklist (admin-only) */}
        {missing.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle size={18} /> Business details still required ({missing.length})
            </div>
            <p className="mt-1 text-sm text-amber-700">
              These are hidden on public pages until filled (no fake data is shown). Complete them in{" "}
              <Link href="/admin/trust/config" className="font-semibold underline">
                Ownership & Contact settings
              </Link>
              .
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missing.map((m) => (
                <span key={m} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {m}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} /> All required business & legal details are configured.
          </div>
        )}

        {/* Policy pages by group */}
        {(["company", "editorial", "legal"] as const).map((g) => (
          <div key={g}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#c41e20]">
              {POLICY_GROUP_LABELS[g].en}
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">Page</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Last updated</th>
                    <th className="px-4 py-2.5">Version</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groups[g].map((p) => {
                    const locked = p.editPermission === "super_admin" && !isSuper;
                    return (
                      <tr key={p.key}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#1a2b4c]">{p.titleEn}</div>
                          <div className="text-xs text-gray-400">{p.titleHi}</div>
                          {p.legalReview ? (
                            <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Needs legal review
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {p.published ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Published
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                              Draft
                            </span>
                          )}
                          {!p.saved ? (
                            <span className="ml-1 text-[10px] text-gray-400">(default)</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{fmt(p.lastUpdatedAt)}</td>
                        <td className="px-4 py-3 text-gray-600">v{p.version}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={p.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-[#1a2b4c] hover:text-[#1a2b4c]"
                            >
                              <ExternalLink size={12} /> Preview
                            </a>
                            {locked ? (
                              <span className="text-xs text-gray-400">Super admin only</span>
                            ) : (
                              <Link
                                href={`/admin/trust/${p.key}`}
                                className="inline-flex items-center gap-1 rounded-md bg-[#1a2b4c] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                              >
                                <Pencil size={12} /> Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <FileText size={12} /> All pages support Hindi & English and show a &quot;Last updated&quot; date. Content is
          served from Firestore with safe built-in defaults.
        </p>
      </div>
    </RoleGuard>
  );
}
