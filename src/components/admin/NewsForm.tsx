"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { NewsFormData, Category, MediaItem } from "@/types";
import { createSlug } from "@/lib/utils";
import { getAllCategories, isNewsSlugTaken } from "@/firebase/firestore";
import FormInput from "./FormInput";
import FormTextarea from "./FormTextarea";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import MediaPicker from "./MediaPicker";
import ToggleSwitch from "./ToggleSwitch";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Eye, X } from "lucide-react";
import Image from "next/image";

interface NewsFormProps {
  initialData?: NewsFormData;
  articleId?: string;
  onSubmit: (data: NewsFormData) => Promise<void>;
  submitLabel?: string;
}

const defaultFormData: NewsFormData = {
  titleHi: "",
  titleEn: "",
  slug: "",
  summaryHi: "",
  summaryEn: "",
  contentHi: "",
  contentEn: "",
  categoryId: "desh",
  imageUrl: "",
  imageAltHi: "",
  imageAltEn: "",
  author: "News Junction Team",
  sourceName: "",
  sourceUrl: "",
  tags: "",
  status: "draft",
  isBreaking: false,
  isFeatured: false,
  isTrending: false,
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  scheduledPublishAt: "",
};

export default function NewsForm({
  initialData,
  articleId,
  onSubmit,
  submitLabel = "Save Article",
}: NewsFormProps) {
  const [formData, setFormData] = useState<NewsFormData>(initialData || defaultFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getAllCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!slugManual && formData.titleEn) {
      setFormData((prev) => ({ ...prev, slug: createSlug(formData.titleEn) }));
    }
  }, [formData.titleEn, slugManual]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "slug") setSlugManual(true);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};
    if (!formData.titleHi.trim()) newErrors.titleHi = "Hindi title is required";
    if (!formData.titleEn.trim()) newErrors.titleEn = "English title is required";
    if (!formData.contentHi.trim()) newErrors.contentHi = "Hindi content is required";
    if (!formData.contentEn.trim()) newErrors.contentEn = "English content is required";
    if (!formData.slug.trim()) newErrors.slug = "Slug is required";

    if (formData.slug) {
      const taken = await isNewsSlugTaken(formData.slug, articleId);
      if (taken) newErrors.slug = "This slug is already in use";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const valid = await validate();
    if (!valid) {
      toast.error("Please fix form errors");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(formData);
      toast.success("Article saved successfully");
    } catch {
      toast.error("Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (item: MediaItem) => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: item.url,
      imageAltHi: item.altHi || prev.imageAltHi,
      imageAltEn: item.altEn || prev.imageAltEn,
    }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Titles */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Titles</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="शीर्षक (Hindi) *" name="titleHi" value={formData.titleHi} onChange={handleChange} error={errors.titleHi} required />
            <FormInput label="Title (English) *" name="titleEn" value={formData.titleEn} onChange={handleChange} error={errors.titleEn} required />
          </div>
          <div className="mt-4">
            <FormInput
              label="Slug *"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              error={errors.slug}
              placeholder="auto-generated-from-english-title"
            />
            <p className="mt-1 text-xs text-gray-500">Auto-generated from English title. Edit manually if needed.</p>
          </div>
        </section>

        {/* Summaries */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Summary</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormTextarea label="सारांश (Hindi)" name="summaryHi" value={formData.summaryHi} onChange={handleChange} rows={3} />
            <FormTextarea label="Summary (English)" name="summaryEn" value={formData.summaryEn} onChange={handleChange} rows={3} />
          </div>
        </section>

        {/* Content */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Content</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <RichTextEditor label="कंटेंट (Hindi) *" value={formData.contentHi} onChange={(v) => setFormData((p) => ({ ...p, contentHi: v }))} />
            <RichTextEditor label="Content (English) *" value={formData.contentEn} onChange={(v) => setFormData((p) => ({ ...p, contentEn: v }))} />
          </div>
        </section>

        {/* Meta */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Article Meta</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm">
                {categories.filter((c) => c.slug !== "home").map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nameHi} / {cat.nameEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <FormInput label="Tags (comma separated)" name="tags" value={formData.tags} onChange={handleChange} placeholder="politics, india" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <FormInput label="Author" name="author" value={formData.author} onChange={handleChange} />
            <FormInput label="Source Name" name="sourceName" value={formData.sourceName} onChange={handleChange} />
            <FormInput label="Source URL" name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} type="url" />
          </div>
        </section>

        {/* Image */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Featured Image</h3>
          <ImageUploader
            value={formData.imageUrl}
            onChange={(url) => setFormData((p) => ({ ...p, imageUrl: url }))}
            onSelectFromLibrary={() => setShowMediaPicker(true)}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormInput
              label="Image URL (paste link if upload fails)"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              type="url"
              placeholder="https://example.com/image.jpg"
            />
            <FormInput label="Image ALT (Hindi)" name="imageAltHi" value={formData.imageAltHi} onChange={handleChange} />
            <FormInput label="Image ALT (English)" name="imageAltEn" value={formData.imageAltEn} onChange={handleChange} />
          </div>
        </section>

        {/* Flags */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Flags & Schedule</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleSwitch label="Breaking News" checked={formData.isBreaking} onChange={(v) => setFormData((p) => ({ ...p, isBreaking: v }))} />
            <ToggleSwitch label="Featured" checked={formData.isFeatured} onChange={(v) => setFormData((p) => ({ ...p, isFeatured: v }))} />
            <ToggleSwitch label="Trending" checked={formData.isTrending} onChange={(v) => setFormData((p) => ({ ...p, isTrending: v }))} />
          </div>
          <div className="mt-4">
            <FormInput
              label="Schedule Publish (optional)"
              name="scheduledPublishAt"
              type="datetime-local"
              value={formData.scheduledPublishAt}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* SEO */}
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">SEO</h3>
          <div className="grid gap-4">
            <FormInput label="SEO Title" name="seoTitle" value={formData.seoTitle} onChange={handleChange} placeholder="Leave empty to use article title" />
            <FormTextarea label="SEO Description" name="seoDescription" value={formData.seoDescription} onChange={handleChange} rows={2} />
            <FormInput label="Canonical URL (optional)" name="canonicalUrl" value={formData.canonicalUrl} onChange={handleChange} type="url" />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#c41e20] px-8 py-3 text-sm font-bold text-white hover:bg-[#a01820] disabled:opacity-50"
          >
            {saving ? "Saving..." : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1a2b4c] px-6 py-3 text-sm font-medium text-[#1a2b4c] hover:bg-gray-50"
          >
            <Eye size={16} />
            Preview
          </button>
        </div>
      </form>

      <MediaPicker open={showMediaPicker} onClose={() => setShowMediaPicker(false)} onSelect={handleMediaSelect} />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a2b4c]">Article Preview</h3>
              <button onClick={() => setShowPreview(false)}><X size={20} /></button>
            </div>
            {formData.imageUrl && (
              <div className="relative mb-4 aspect-video overflow-hidden rounded-lg">
                <Image src={formData.imageUrl} alt={formData.imageAltEn} fill className="object-cover" sizes="768px" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-[#1a2b4c]">{formData.titleHi}</h2>
            <p className="mt-1 text-lg text-gray-600">{formData.titleEn}</p>
            <p className="mt-2 text-sm text-gray-500">By {formData.author}</p>
            <div className="article-content mt-6" dangerouslySetInnerHTML={{ __html: formData.contentHi }} />
          </div>
        </div>
      )}
    </>
  );
}
