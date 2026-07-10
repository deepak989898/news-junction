"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Eye, Check, X, ExternalLink } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllRawNews } from "@/firebase/firestore";
import { RawNewsItem } from "@/lib/automation/types";
import { approveRawNews, rejectRawNewsApi } from "@/lib/automation/client-api";
import toast from "react-hot-toast";

export default function ApprovalQueuePage() {
  const [items, setItems] = useState<RawNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pendingApproval");
  const [riskFilter, setRiskFilter] = useState("all");
  const [preview, setPreview] = useState<RawNewsItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; id: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getAllRawNews(200);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (riskFilter !== "all" && item.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [items, statusFilter, riskFilter]);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      if (confirmAction.type === "approve") {
        await approveRawNews(confirmAction.id);
        toast.success("Published successfully");
      } else {
        await rejectRawNewsApi(confirmAction.id, "Rejected by admin");
        toast.success("Rejected");
      }
      setConfirmAction(null);
      setPreview(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="Approval Queue" />

      <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="pendingApproval">Pending Approval</option>
          <option value="fetched">Fetched</option>
          <option value="processing">Processing</option>
          <option value="published">Published</option>
          <option value="duplicate">Duplicate</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All Risk</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <p className="flex items-center text-sm text-gray-500 md:col-span-2">{filtered.length} items</p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No items in queue.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="line-clamp-1 font-medium">{item.aiOutput?.titleHi || item.originalTitle}</p>
                    <p className="line-clamp-1 text-xs text-gray-500">{item.aiOutput?.titleEn}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.sourceName}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={item.riskLevel} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setPreview(item)} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" title="Preview">
                        <Eye size={16} />
                      </button>
                      <a href={item.originalLink} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Source">
                        <ExternalLink size={16} />
                      </a>
                      {item.status === "pendingApproval" && item.aiOutput && (
                        <>
                          <button onClick={() => setConfirmAction({ type: "approve", id: item.id })} className="rounded p-1.5 text-green-600 hover:bg-green-50" title="Approve & Publish">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setConfirmAction({ type: "reject", id: item.id })} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Reject">
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {item.newsId && (
                        <Link href={`/admin/news/${item.newsId}/edit`} className="rounded px-2 py-1 text-xs text-blue-600 hover:underline">
                          Edit
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Preview</h3>
              <button onClick={() => setPreview(null)}><X size={20} /></button>
            </div>
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p><strong>Original:</strong> {preview.originalTitle}</p>
              <p className="mt-1 text-gray-600">{preview.originalSummary}</p>
              <a href={preview.originalLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[#c41e20] hover:underline">
                View source →
              </a>
            </div>
            {preview.aiOutput ? (
              <div>
                {(preview.generatedImageUrl || preview.originalImage) && (
                  <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg border">
                    <img
                      src={preview.generatedImageUrl || preview.originalImage}
                      alt={preview.aiOutput.imageAltHi || preview.aiOutput.titleHi}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <h4 className="font-bold text-[#1a2b4c]">{preview.aiOutput.titleHi}</h4>
                <p className="text-gray-600">{preview.aiOutput.titleEn}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="mb-2 text-sm font-bold">Hindi Content</h5>
                    <div className="article-content text-sm" dangerouslySetInnerHTML={{ __html: preview.aiOutput.contentHi }} />
                  </div>
                  <div>
                    <h5 className="mb-2 text-sm font-bold">English Content</h5>
                    <div className="article-content text-sm" dangerouslySetInnerHTML={{ __html: preview.aiOutput.contentEn }} />
                  </div>
                </div>
                {preview.aiOutput.factCheckNotes && (
                  <p className="mt-4 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                    <strong>Fact check:</strong> {preview.aiOutput.factCheckNotes}
                  </p>
                )}
                {preview.status === "pendingApproval" && (
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => setConfirmAction({ type: "approve", id: preview.id })} className="rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white">
                      Approve & Publish
                    </button>
                    <button onClick={() => setConfirmAction({ type: "reject", id: preview.id })} className="rounded-lg border border-red-300 px-6 py-2 text-sm text-red-600">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Not yet processed by AI. Run process cron or wait for automation.</p>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.type === "approve" ? "Approve & Publish" : "Reject Article"}
        message={confirmAction?.type === "approve" ? "Publish this article? OpenAI will generate a featured image (may take 30-60 seconds)." : "Reject this article? It will not be published."}
        confirmLabel={confirmAction?.type === "approve" ? "Publish" : "Reject"}
        variant={confirmAction?.type === "approve" ? "primary" : "danger"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={processing}
      />
    </RoleGuard>
  );
}
