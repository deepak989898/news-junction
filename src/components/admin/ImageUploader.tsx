"use client";

import { useState, ChangeEvent } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { uploadNewsImage } from "@/firebase/storage";
import toast from "react-hot-toast";

function formatUploadError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code || "");
    if (code === "storage/unauthorized") {
      return "Upload denied. Login as admin and deploy storage.rules to Firebase.";
    }
    if (code === "storage/unauthenticated") {
      return "Please login again before uploading.";
    }
    if (code === "storage/unknown" || code.includes("storage/")) {
      return `Storage error (${code}). Enable Firebase Storage and check STORAGE_BUCKET env var.`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Failed to upload image";
}

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  onSelectFromLibrary?: () => void;
  label?: string;
}

export default function ImageUploader({
  value,
  onChange,
  onSelectFromLibrary,
  label = "Featured Image",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadNewsImage(file);
      onChange(url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(formatUploadError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <div className="relative h-48 w-72 overflow-hidden rounded-lg border">
            <Image src={value} alt="Preview" fill className="object-cover" sizes="288px" />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-[#1a2b4c]">
            {uploading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Upload className="mb-2 text-gray-400" size={32} />
                <span className="text-sm text-gray-500">Click to upload</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
          {onSelectFromLibrary && (
            <button
              type="button"
              onClick={onSelectFromLibrary}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-4 text-sm font-medium text-[#1a2b4c] hover:bg-gray-50"
            >
              <ImageIcon size={18} />
              Media Library
            </button>
          )}
        </div>
      )}
    </div>
  );
}
