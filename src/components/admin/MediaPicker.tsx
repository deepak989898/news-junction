"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, X, Check } from "lucide-react";
import { getAllMedia } from "@/firebase/firestore";
import { MediaItem } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}

export default function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getAllMedia()
      .then(setMedia)
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = media.filter((m) =>
    m.filename.toLowerCase().includes(search.toLowerCase())
  );

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
              placeholder="Search by filename..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#1a2b4c] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No media found. Upload images in Media Library.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-[#c41e20]"
                >
                  <div className="relative aspect-square">
                    <Image src={item.url} alt={item.filename} fill className="object-cover" sizes="150px" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Check className="text-white" size={24} />
                    </div>
                  </div>
                  <p className="truncate p-2 text-xs text-gray-600">{item.filename}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
