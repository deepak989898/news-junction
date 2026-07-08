"use client";

import { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { Upload, Trash2, Copy, Search } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import ConfirmModal from "@/components/admin/ConfirmModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAllMedia, createMediaItem, deleteMediaItem } from "@/firebase/firestore";
import { uploadMediaFile } from "@/firebase/storage";
import { MediaItem } from "@/types";
import { canDeleteMedia } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function MediaPage() {
  const { adminUser, user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const data = await getAllMedia();
    setMedia(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
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
      toast.success("Image uploaded");
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
    if (!deleteId) return;
    await deleteMediaItem(deleteId);
    toast.success("Media deleted");
    setDeleteId(null);
    await load();
  };

  const filtered = media.filter((m) => m.filename.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="Media Library" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#c41e20] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a01820]">
          {uploading ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
          Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename..."
            className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No media files. Upload images to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="relative aspect-square">
                <Image src={item.url} alt={item.filename} fill className="object-cover" sizes="200px" />
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium">{item.filename}</p>
                <p className="text-xs text-gray-500">{(item.size / 1024).toFixed(1)} KB</p>
                <div className="mt-2 flex gap-1">
                  <button onClick={() => copyUrl(item.url)} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" title="Copy URL">
                    <Copy size={14} />
                  </button>
                  {canDeleteMedia(adminUser?.role) && (
                    <button onClick={() => setDeleteId(item.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!deleteId} title="Delete Media" message="Delete this media file?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </RoleGuard>
  );
}
