"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Check, X, ExternalLink, ImageIcon, Trash2, Pencil, Sparkles, Rocket } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllRawNews, updateRawNewsClient } from "@/firebase/firestore";
import { RawNewsItem } from "@/lib/automation/types";
import {
  approveRawNews,
  rejectRawNewsApi,
  bulkApproveRawNews,
  bulkRejectRawNews,
  bulkDeleteRawNews,
  processRawNewsItemApi,
} from "@/lib/automation/client-api";
import { startBulkGeneratePublish, subscribeBulkPublish } from "@/lib/admin/bulk-publish-store";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin } from "@/lib/permissions";
import toast from "react-hot-toast";

type BulkAction = "approve" | "reject" | "delete";

type EditForm = {
  titleHi: string;
  titleEn: string;
  summaryHi: string;
  summaryEn: string;
  contentHi: string;
  contentEn: string;
};

function getItemImageUrl(item: RawNewsItem): string | null {
  if (item.generatedImageUrl?.startsWith("https")) return item.generatedImageUrl;
  if (item.originalImage?.startsWith("https")) return item.originalImage;
  return null;
}

function formatFetchedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date}, ${time}`;
}

function canApproveItem(item: RawNewsItem) {
  return item.status === "pendingApproval" && !!item.aiOutput;
}

function canRejectItem(item: RawNewsItem) {
  return item.status === "pendingApproval";
}

// Fetched/failed/duplicate items can be (re)generated into an article on demand.
function canGenerateItem(item: RawNewsItem) {
  return (
    (item.status === "fetched" || item.status === "failed" || item.status === "duplicate") &&
    !item.newsId
  );
}

// Content that has been generated (but not yet published) can be edited before publishing.
function canEditItem(item: RawNewsItem) {
  return !!item.aiOutput && !item.newsId && item.status !== "published";
}

// Any not-yet-published item can be bulk generated & published.
function canBulkPublishItem(item: RawNewsItem) {
  return !item.newsId && item.status !== "published";
}

export default function ApprovalQueuePage() {
  const { adminUser } = useAuth();
  const [items, setItems] = useState<RawNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pendingApproval");
  const [riskFilter, setRiskFilter] = useState("all");
  const [preview, setPreview] = useState<RawNewsItem | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; alt: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ type: BulkAction; ids: string[] } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<RawNewsItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    titleHi: "",
    titleEn: "",
    summaryHi: "",
    summaryEn: "",
    contentHi: "",
    contentEn: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getAllRawNews(200);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Keep the button state in sync and refresh the list when a background task completes.
  useEffect(() => {
    let prevRunning = false;
    const unsub = subscribeBulkPublish((s) => {
      setBulkRunning(s.running);
      if (prevRunning && !s.running) {
        load();
      }
      prevRunning = s.running;
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (riskFilter !== "all" && item.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [items, statusFilter, riskFilter]);

  const selectedItems = useMemo(
    () => filtered.filter((item) => selected.includes(item.id)),
    [filtered, selected]
  );

  const approvableSelected = selectedItems.filter(canApproveItem).map((i) => i.id);
  const rejectableSelected = selectedItems.filter(canRejectItem).map((i) => i.id);
  const publishableSelected = selectedItems.filter(canBulkPublishItem).map((i) => i.id);

  const handleBulkGeneratePublish = () => {
    if (!publishableSelected.length || bulkRunning) return;
    const ids = [...publishableSelected];
    setSelected([]);
    toast.success(`Publishing ${ids.length} article(s) in the background`);
    void startBulkGeneratePublish(ids).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Could not start bulk publish");
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((item) => item.id));
    }
  };

  const openImageZoom = (item: RawNewsItem) => {
    const url = getItemImageUrl(item);
    if (!url) return;
    setZoomImage({
      url,
      alt: item.aiOutput?.imageAltHi || item.aiOutput?.titleHi || item.originalTitle,
    });
  };

  const handleGenerate = async (item: RawNewsItem) => {
    setRowBusy(item.id);
    try {
      const res = await processRawNewsItemApi(item.id);
      if (res.status === "published") {
        toast.success("Article generated and published");
      } else if (res.status === "pendingApproval") {
        toast.success("Article generated — ready to review & publish");
      } else if (res.status === "duplicate") {
        toast(res.message || "Detected as duplicate");
      } else {
        toast(res.message || "Processed");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setRowBusy(null);
    }
  };

  const openEdit = (item: RawNewsItem) => {
    setEditItem(item);
    setEditForm({
      titleHi: item.aiOutput?.titleHi || "",
      titleEn: item.aiOutput?.titleEn || "",
      summaryHi: item.aiOutput?.summaryHi || "",
      summaryEn: item.aiOutput?.summaryEn || "",
      contentHi: item.aiOutput?.contentHi || "",
      contentEn: item.aiOutput?.contentEn || "",
    });
  };

  const saveEdit = async () => {
    if (!editItem || !editItem.aiOutput) return;
    setSavingEdit(true);
    try {
      const updatedAiOutput = { ...editItem.aiOutput, ...editForm };
      await updateRawNewsClient(editItem.id, { aiOutput: updatedAiOutput });
      toast.success("Changes saved");
      setEditItem(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSingleConfirm = async () => {
    if (!confirmAction || confirmAction.ids.length !== 1) return;
    const id = confirmAction.ids[0];
    setProcessing(true);
    try {
      if (confirmAction.type === "approve") {
        await approveRawNews(id);
        toast.success("Published successfully");
      } else if (confirmAction.type === "reject") {
        await rejectRawNewsApi(id, "Rejected by admin");
        toast.success("Rejected");
      } else {
        await bulkDeleteRawNews([id]);
        toast.success("Deleted from queue");
      }
      setConfirmAction(null);
      setPreview(null);
      setSelected((prev) => prev.filter((x) => x !== id));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (!confirmAction || confirmAction.ids.length === 0) return;
    setProcessing(true);
    setBulkProgress("");

    try {
      if (confirmAction.type === "approve") {
        const ids = confirmAction.ids.filter((id) => {
          const item = items.find((x) => x.id === id);
          return item && canApproveItem(item);
        });
        setBulkProgress(`Publishing 0/${ids.length}...`);
        const result = await bulkApproveRawNews(ids, (done, total) => {
          setBulkProgress(`Publishing ${done}/${total}...`);
        });
        toast.success(`Approved ${result.success}${result.failed ? `, failed ${result.failed}` : ""}`);
      } else if (confirmAction.type === "reject") {
        const result = await bulkRejectRawNews(confirmAction.ids);
        toast.success(`Rejected ${result.processed}${result.failed ? `, failed ${result.failed}` : ""}`);
      } else {
        const result = await bulkDeleteRawNews(confirmAction.ids);
        toast.success(`Deleted ${result.deleted} item(s)`);
      }

      setConfirmAction(null);
      setPreview(null);
      setSelected([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setProcessing(false);
      setBulkProgress("");
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.ids.length === 1) {
      await handleSingleConfirm();
    } else {
      await handleBulkConfirm();
    }
  };

  const confirmMessage = useMemo(() => {
    if (!confirmAction) return "";
    const count = confirmAction.ids.length;
    if (confirmAction.type === "approve") {
      return count === 1
        ? "Publish this article? OpenAI will generate an optimized WebP image (30-60 seconds)."
        : `Publish ${count} selected articles? Each may take 30-60 seconds for AI image generation.`;
    }
    if (confirmAction.type === "reject") {
      return count === 1
        ? "Reject this article? It will not be published."
        : `Reject ${count} selected articles? They will not be published.`;
    }
    return count === 1
      ? "Delete this queue item permanently?"
      : `Delete ${count} selected queue items permanently?`;
  }, [confirmAction]);

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
        <p className="flex items-center text-sm text-gray-500 md:col-span-2">
          {filtered.length} items · {selected.length} selected
        </p>
      </div>

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#1a2b4c] p-3 text-white">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <button
            type="button"
            disabled={publishableSelected.length === 0 || bulkRunning}
            onClick={handleBulkGeneratePublish}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
            title="Regenerate the article for each selected item and publish — runs in the background"
          >
            <Rocket size={14} />
            {bulkRunning ? "Publishing…" : `Generate & Publish (${publishableSelected.length})`}
          </button>
          <button
            type="button"
            disabled={approvableSelected.length === 0 || processing}
            onClick={() => setConfirmAction({ type: "approve", ids: approvableSelected })}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Approve ({approvableSelected.length})
          </button>
          <button
            type="button"
            disabled={rejectableSelected.length === 0 || processing}
            onClick={() => setConfirmAction({ type: "reject", ids: rejectableSelected })}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            Reject ({rejectableSelected.length})
          </button>
          {isSuperAdmin(adminUser?.role) && (
            <button
              type="button"
              disabled={processing}
              onClick={() => setConfirmAction({ type: "delete", ids: selected })}
              className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              Delete ({selected.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto text-xs underline opacity-90"
          >
            Clear selection
          </button>
        </div>
      )}

      {bulkProgress && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900">{bulkProgress}</p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No items in queue.</p>
        ) : (
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Image</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Fetched</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const imageUrl = getItemImageUrl(item);
                return (
                  <tr key={item.id} className={selected.includes(item.id) ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.originalTitle}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {imageUrl ? (
                        <button
                          type="button"
                          onClick={() => openImageZoom(item)}
                          className="group relative block h-14 w-24 overflow-hidden rounded-md border border-gray-200 bg-gray-100"
                          title="Click to zoom image"
                        >
                          <img
                            src={imageUrl}
                            alt={item.aiOutput?.imageAltHi || item.originalTitle}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <div
                          className="flex h-14 w-24 flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400"
                          title="AI image on approve"
                        >
                          <ImageIcon size={14} />
                          <span>On approve</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 font-medium">{item.aiOutput?.titleHi || item.originalTitle}</p>
                      <p className="line-clamp-1 text-xs text-gray-500">{item.aiOutput?.titleEn}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.sourceName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{formatFetchedAt(item.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.riskLevel} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setPreview(item)} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" title="Preview">
                          <Eye size={16} />
                        </button>
                        <a href={item.originalLink} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Source">
                          <ExternalLink size={16} />
                        </a>
                        {canGenerateItem(item) && (
                          <button
                            type="button"
                            onClick={() => handleGenerate(item)}
                            disabled={rowBusy === item.id}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                            title="Generate AI article for this item"
                          >
                            {rowBusy === item.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Sparkles size={14} /> Generate
                              </>
                            )}
                          </button>
                        )}
                        {canEditItem(item) && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                            title="Edit content before publishing"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canApproveItem(item) && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: "approve", ids: [item.id] })}
                            className="rounded p-1.5 text-green-600 hover:bg-green-50"
                            title="Approve & Publish"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {canRejectItem(item) && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: "reject", ids: [item.id] })}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        )}
                        {isSuperAdmin(adminUser?.role) && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: "delete", ids: [item.id] })}
                            className="rounded p-1.5 text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {item.newsId && (
                          <Link href={`/admin/news/${item.newsId}/edit`} className="rounded px-2 py-1 text-xs text-blue-600 hover:underline">
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {zoomImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setZoomImage(null)} />
          <div className="relative max-h-[90vh] max-w-5xl">
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X size={20} />
            </button>
            <img
              src={zoomImage.url}
              alt={zoomImage.alt}
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-xs text-white/80">{zoomImage.alt}</p>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Preview</h3>
              <button type="button" onClick={() => setPreview(null)}><X size={20} /></button>
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
                {getItemImageUrl(preview) ? (
                  <button
                    type="button"
                    onClick={() => openImageZoom(preview)}
                    className="relative mb-4 block h-48 w-full overflow-hidden rounded-lg border"
                  >
                    <img
                      src={getItemImageUrl(preview)!}
                      alt={preview.aiOutput.imageAltHi || preview.aiOutput.titleHi}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">Click to zoom</span>
                  </button>
                ) : (
                  <p className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                    AI featured image (optimized WebP) will be generated when you approve this article.
                  </p>
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "approve", ids: [preview.id] })}
                      className="rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white"
                    >
                      Approve & Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const item = preview;
                        setPreview(null);
                        openEdit(item);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-amber-300 px-6 py-2 text-sm font-medium text-amber-700"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: "reject", ids: [preview.id] })}
                      className="rounded-lg border border-red-300 px-6 py-2 text-sm text-red-600"
                    >
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

      {editItem && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !savingEdit && setEditItem(null)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a2b4c]">Edit article content</h3>
              <button type="button" onClick={() => !savingEdit && setEditItem(null)}><X size={20} /></button>
            </div>
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Edit the AI-generated content, then Save. Approve &amp; Publish afterwards to push it live.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Title (Hindi)</span>
                  <input
                    value={editForm.titleHi}
                    onChange={(e) => setEditForm((p) => ({ ...p, titleHi: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Title (English)</span>
                  <input
                    value={editForm.titleEn}
                    onChange={(e) => setEditForm((p) => ({ ...p, titleEn: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Summary (Hindi)</span>
                  <textarea
                    value={editForm.summaryHi}
                    onChange={(e) => setEditForm((p) => ({ ...p, summaryHi: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Summary (English)</span>
                  <textarea
                    value={editForm.summaryEn}
                    onChange={(e) => setEditForm((p) => ({ ...p, summaryEn: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Content (Hindi)</span>
                  <textarea
                    value={editForm.contentHi}
                    onChange={(e) => setEditForm((p) => ({ ...p, contentHi: e.target.value }))}
                    rows={10}
                    className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Content (English)</span>
                  <textarea
                    value={editForm.contentEn}
                    onChange={(e) => setEditForm((p) => ({ ...p, contentEn: e.target.value }))}
                    rows={10}
                    className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                disabled={savingEdit}
                className="rounded-lg border px-5 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex items-center gap-2 rounded-lg bg-[#1a2b4c] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingEdit ? <LoadingSpinner size="sm" /> : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={
          confirmAction?.type === "approve"
            ? confirmAction.ids.length > 1 ? "Bulk Approve & Publish" : "Approve & Publish"
            : confirmAction?.type === "reject"
              ? confirmAction.ids.length > 1 ? "Bulk Reject" : "Reject Article"
              : confirmAction && confirmAction.ids.length > 1 ? "Bulk Delete" : "Delete Queue Item"
        }
        message={confirmMessage}
        confirmLabel={
          confirmAction?.type === "approve" ? "Publish" : confirmAction?.type === "reject" ? "Reject" : "Delete"
        }
        variant={confirmAction?.type === "approve" ? "primary" : "danger"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={processing}
      />
    </RoleGuard>
  );
}
