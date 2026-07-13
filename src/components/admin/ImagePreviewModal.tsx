"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImagePreviewModalProps {
  open: boolean;
  imageUrl: string;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export default function ImagePreviewModal({
  open,
  imageUrl,
  alt = "",
  title,
  onClose,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState<"fit" | "full">("full");
  const [dimensions, setDimensions] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setZoom("full");
    setDimensions("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, imageUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[95vh] w-full max-w-7xl flex-col">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && (
              <p className="truncate text-sm font-medium text-white">{title}</p>
            )}
            <p className="mt-0.5 truncate text-xs text-white/60">{imageUrl}</p>
            {dimensions && (
              <p className="mt-0.5 text-xs text-white/50">Resolution: {dimensions}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => (z === "fit" ? "full" : "fit"))}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              title={zoom === "fit" ? "View at 100% size" : "Fit to screen"}
            >
              {zoom === "fit" ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div
          className={`flex flex-1 items-center justify-center overflow-auto rounded-lg bg-black/40 ${
            zoom === "fit" ? "p-2" : "p-4"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imageUrl}
            src={imageUrl}
            alt={alt}
            decoding="async"
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions(`${img.naturalWidth} × ${img.naturalHeight}px`);
            }}
            className={
              zoom === "fit"
                ? "max-h-[80vh] max-w-full object-contain"
                : "h-auto w-auto max-w-none object-none"
            }
            style={{ imageRendering: zoom === "full" ? "auto" : "auto" }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-white/50">
          Opens at 100% zoom for quality check · Toggle fit/100% · Esc to close
        </p>
      </div>
    </div>
  );
}
