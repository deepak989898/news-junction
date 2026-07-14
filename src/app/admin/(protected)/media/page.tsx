"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { Upload, Trash2, Copy, Search, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import ConfirmModal from "@/components/admin/ConfirmModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { createMediaItem } from "@/firebase/firestore";
import { uploadMediaFile } from "@/firebase/storage";
import { canDeleteMedia } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/automation/client-api";
import type { MediaLibraryItem, MediaLibrarySource } from "@/lib/media-library/service";
import toast from "react-hot-toast";
import { runWithAdminBusy } from "@/lib/admin/busy-store";

type Filter = "all" | MediaLibrarySource;

const SOURCE_LABEL: Record<MediaLibrarySource, string> = {
  upload: "Upload",
  ai_media: "AI Media",
  article_pipeline: "Article AI",
};

export default function MediaPage() {
  const { adminUser, user } = useAuth();
  const [media, setMedia] = useState<MediaLibraryItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, upload: 0, ai_media: 0, article_pipeline: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteTarget, setDeleteTarget] = useState<MediaLibraryItem | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const load = async () => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/media/library?limit=400", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load media");
      setMedia((data.items as MediaLibraryItem[]) || []);
      setCounts(data.counts || { total: 0, upload: 0, ai_media: 0, article_pipeline: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load media");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await runWithAdminBusy("Uploading image… please wait", async () => {
        const { url } = await uploadMediaFile(file);
        await createMediaItem({
          url,
          filename: file.name,
          altHi: "",
          altEn: "",
          uploadedBy: user.email || user.uid,
          size: file.size,
          contentType: file.type,
        });
      });
      toast.success("Image uploaded");
      setLoading(true);
      await load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/admin/media/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: deleteTarget.id,
          url: deleteTarget.url,
          thumbnailUrl: deleteTarget.thumbnailUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success(String(data.message || "Media deleted"));
      if (zoomIndex !== null) setZoomIndex(null);
      setDeleteTarget(null);
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered = useMemo(() => {
    return media.filter((m) => {
      if (filter !== "all" && m.source !== filter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.filename.toLowerCase().includes(q) ||
        m.altEn.toLowerCase().includes(q) ||
        m.altHi.toLowerCase().includes(q) ||
        m.uploadedBy.toLowerCase().includes(q)
      );
    });
  }, [media, filter, search]);

  const zoomItem = zoomIndex !== null ? filtered[zoomIndex] : null;

  useEffect(() => {
    if (zoomIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomIndex(null);
      if (e.key === "ArrowRight") setZoomIndex((i) => (i === null ? i : Math.min(filtered.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setZoomIndex((i) => (i === null ? i : Math.max(0, i - 1)));
      if (e.key === "+" || e.key === "=") setZoomScale((s) => Math.min(4, s + 0.25));
      if (e.key === "-") setZoomScale((s) => Math.max(0.5, s - 0.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIndex, filtered.length]);

  useEffect(() => {
    setZoomScale(1);
  }, [zoomIndex]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="Media Library" />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#c41e20] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a01820]">
          {uploading ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
          Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, alt, or source..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${counts.total})`],
            ["upload", `Uploads (${counts.upload})`],
            ["ai_media", `AI Media (${counts.ai_media})`],
            ["article_pipeline", `Article AI (${counts.article_pipeline})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === key ? "border-[#c41e20] bg-[#c41e20] text-white" : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No media files found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item, index) => (
            <div key={item.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <button
                type="button"
                className="relative aspect-square w-full cursor-zoom-in"
                onClick={() => setZoomIndex(index)}
                title="Click to zoom"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white">
                  <ZoomIn size={14} />
                </span>
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {SOURCE_LABEL[item.source]}
                </span>
              </button>
              <div className="p-3">
                <p className="truncate text-xs font-medium" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {item.size > 0 ? `${(item.size / 1024).toFixed(1)} KB · ` : ""}
                  {item.uploadedBy}
                </p>
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                    title="Copy URL"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => setZoomIndex(index)}
                    className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                    title="Zoom"
                  >
                    <ZoomIn size={14} />
                  </button>
                  {canDeleteMedia(adminUser?.role) && (
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoomItem && zoomIndex !== null && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/90">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{zoomItem.filename}</p>
              <p className="text-xs text-white/70">
                {SOURCE_LABEL[zoomItem.source]} · {zoomIndex + 1}/{filtered.length} · zoom {Math.round(zoomScale * 100)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded border border-white/30 px-2 py-1 text-sm"
                onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
              >
                −
              </button>
              <button className="rounded border border-white/30 px-2 py-1 text-sm" onClick={() => setZoomScale(1)}>
                Reset
              </button>
              <button
                className="rounded border border-white/30 px-2 py-1 text-sm"
                onClick={() => setZoomScale((s) => Math.min(4, s + 0.25))}
              >
                +
              </button>
              <button className="rounded p-2 hover:bg-white/10" onClick={() => setZoomIndex(null)} title="Close">
                <X size={20} />
              </button>
              {canDeleteMedia(adminUser?.role) && (
                <button
                  className="rounded border border-red-400/60 px-2 py-1 text-sm text-red-200 hover:bg-red-900/40"
                  onClick={() => setDeleteTarget(zoomItem)}
                  title="Delete image"
                >
                  <Trash2 className="mr-1 inline h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center overflow-auto p-4"
            onClick={() => setZoomIndex(null)}
          >
            <button
              className="absolute left-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setZoomIndex(Math.max(0, zoomIndex - 1));
              }}
              disabled={zoomIndex <= 0}
            >
              <ChevronLeft size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomItem.url}
              alt={zoomItem.filename}
              onClick={(e) => e.stopPropagation()}
              style={{ transform: `scale(${zoomScale})` }}
              className="max-h-[85vh] max-w-[92vw] object-contain transition-transform duration-150"
            />
            <button
              className="absolute right-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                setZoomIndex(Math.min(filtered.length - 1, zoomIndex + 1));
              }}
              disabled={zoomIndex >= filtered.length - 1}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Media"
        message={
          deleteTarget?.source === "article_pipeline"
            ? `Delete "${deleteTarget.filename}"? The article will use a category fallback image instead.`
            : `Delete "${deleteTarget?.filename || "this image"}" from the media library?`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </RoleGuard>
  );
}
