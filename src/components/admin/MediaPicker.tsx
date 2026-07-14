"use client";

import { useEffect, useState } from "react";
import { Search, X, Check, ZoomIn } from "lucide-react";
import { getAuthToken } from "@/lib/automation/client-api";
import type { MediaLibraryItem } from "@/lib/media-library/service";
import { MediaItem } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}

export default function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<MediaLibraryItem | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch("/api/admin/media/library?limit=300", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load media");
        setMedia((data.items as MediaLibraryItem[]) || []);
      } catch {
        setMedia([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) return null;

  const filtered = media.filter((m) =>
    `${m.filename} ${m.altEn} ${m.altHi}`.toLowerCase().includes(search.toLowerCase())
  );

  const toMediaItem = (item: MediaLibraryItem): MediaItem => ({
    id: item.id,
    url: item.url,
    filename: item.filename,
    altHi: item.altHi,
    altEn: item.altEn,
    uploadedBy: item.uploadedBy,
    createdAt: null,
    size: item.size,
    contentType: item.contentType,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-bold text-[#1a2b4c]">Select from Media Library</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search uploads, AI media, and article images..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#1a2b4c] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No media found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(toMediaItem(item));
                      onClose();
                    }}
                    className="relative block w-full"
                  >
                    <div className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Check className="text-white" size={24} />
                      </div>
                    </div>
                    <p className="truncate p-2 text-xs text-gray-600">{item.filename}</p>
                  </button>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                    title="Zoom"
                    onClick={() => setPreview(item)}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4" onClick={() => setPreview(null)}>
          <button className="absolute right-4 top-4 rounded p-2 text-white hover:bg-white/10" onClick={() => setPreview(null)}>
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt={preview.filename}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
