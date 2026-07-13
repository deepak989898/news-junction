"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type AuditClassification =
  | "correct"
  | "generic"
  | "low_quality"
  | "unrelated"
  | "real_person_mismatch_risk"
  | "missing"
  | "logo_fallback"
  | "copyright_unknown";

interface AuditItem {
  newsId: string;
  titleHi: string;
  titleEn: string;
  imageUrl: string;
  classification: AuditClassification;
  imageOrigin?: string;
  imageQualityScore?: number;
  imageRelevanceScore?: number;
  isRealPersonPrimary: boolean;
  priority: number;
  reasons: string[];
  views: number;
}

interface AuditResponse {
  items: AuditItem[];
  summary: Record<AuditClassification, number>;
  total: number;
}

const LABELS: Record<AuditClassification, string> = {
  correct: "Correct",
  generic: "Generic",
  low_quality: "Low Quality",
  unrelated: "Unrelated",
  real_person_mismatch_risk: "Real-Person Risk",
  missing: "Missing",
  logo_fallback: "Logo Fallback",
  copyright_unknown: "Copyright Unknown",
};

export default function ImageAuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [filter, setFilter] = useState<AuditClassification | "review">("review");

  const load = async (saveQueue = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/image-pipeline/audit?limit=300${saveQueue ? "&saveQueue=1" : ""}`);
      if (!res.ok) throw new Error("Audit failed");
      setData(await res.json());
    } catch {
      toast.error("Failed to load image audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const filtered = (data?.items || []).filter((item) => {
    if (filter === "review") return item.classification !== "correct";
    return item.classification === filter;
  });

  return (
    <RoleGuard>
      <div>
        <AdminTopbar title="Image Audit" />
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-600">
              Review published article images for quality, relevance, and real-person compliance.
            </p>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm font-medium text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Audit
            </button>
          </div>

          {loading && !data ? (
            <LoadingSpinner size="lg" />
          ) : data ? (
            <>
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
                {(Object.keys(LABELS) as AuditClassification[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-lg border p-3 text-left ${filter === key ? "border-[#1a2b4c] bg-[#1a2b4c]/5" : "bg-white"}`}
                  >
                    <p className="text-xs text-gray-500">{LABELS[key]}</p>
                    <p className="text-xl font-bold text-[#1a2b4c]">{data.summary[key] || 0}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("review")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === "review" ? "bg-[#1a2b4c] text-white" : "bg-gray-100"}`}
                >
                  Needs Review ({data.items.filter((i) => i.classification !== "correct").length})
                </button>
              </div>

              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Image</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Classification</th>
                        <th className="px-4 py-3">Scores</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.slice(0, 50).map((item) => (
                        <tr key={item.newsId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {item.imageUrl ? (
                              <div className="relative h-12 w-20 overflow-hidden rounded">
                                <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="80px" />
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="line-clamp-1 font-medium">{item.titleHi}</p>
                            <p className="line-clamp-1 text-xs text-gray-500">{item.titleEn}</p>
                            {item.isRealPersonPrimary && (
                              <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                Real-person article
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">
                              {LABELS[item.classification]}
                            </span>
                            <ul className="mt-1 text-[11px] text-gray-500">
                              {item.reasons.slice(0, 2).map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.imageRelevanceScore != null && <p>Relevance: {item.imageRelevanceScore}</p>}
                            {item.imageQualityScore != null && <p>Quality: {item.imageQualityScore}</p>}
                            {item.imageOrigin && <p>Origin: {item.imageOrigin}</p>}
                          </td>
                          <td className="px-4 py-3">
                              <Link
                                href={`/admin/news/${item.newsId}/edit`}
                                className="text-xs font-semibold text-blue-600 hover:underline"
                              >
                                Edit & Replace
                              </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </RoleGuard>
  );
}
