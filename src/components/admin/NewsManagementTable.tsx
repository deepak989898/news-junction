"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { NewsArticle, NewsFilters, Category } from "@/types";
import { formatDateTime, getArticlePublishDate } from "@/lib/utils";
import { canBulkDelete, canDeleteNews } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "./StatusBadge";
import ConfirmModal from "./ConfirmModal";
import ImagePreviewModal from "./ImagePreviewModal";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;

interface NewsManagementTableProps {
  articles: NewsArticle[];
  categories: Category[];
  filters: NewsFilters;
  onFiltersChange: (filters: NewsFilters) => void;
  onDelete: (id: string) => Promise<void>;
  onBulkStatus: (ids: string[], status: "draft" | "published") => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export default function NewsManagementTable({
  articles,
  categories,
  filters,
  onFiltersChange,
  onDelete,
  onBulkStatus,
  onBulkDelete,
}: NewsManagementTableProps) {
  const { adminUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"publish" | "draft" | "delete" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    largeUrl?: string;
    title: string;
    alt: string;
  } | null>(null);

  const filtered = useMemo(() => {
    let result = [...articles];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.titleHi.toLowerCase().includes(term) ||
          a.titleEn.toLowerCase().includes(term)
      );
    }
    if (filters.categoryId && filters.categoryId !== "all") {
      result = result.filter((a) => a.categoryId === filters.categoryId);
    }
    if (filters.status !== "all") {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters.flag !== "all") {
      result = result.filter((a) => {
        if (filters.flag === "breaking") return a.isBreaking;
        if (filters.flag === "featured") return a.isFeatured;
        if (filters.flag === "trending") return a.isTrending;
        return true;
      });
    }

    result.sort((a, b) => {
      if (filters.sort === "mostViewed") return b.views - a.views;
      const aTime = getArticlePublishDate(a)?.getTime() || 0;
      const bTime = getArticlePublishDate(b)?.getTime() || 0;
      return filters.sort === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [articles, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === paginated.length) {
      setSelected([]);
    } else {
      setSelected(paginated.map((a) => a.id));
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction || selected.length === 0) return;
    setProcessing(true);
    try {
      if (bulkAction === "publish") {
        await onBulkStatus(selected, "published");
        toast.success(`${selected.length} articles published`);
      } else if (bulkAction === "draft") {
        await onBulkStatus(selected, "draft");
        toast.success(`${selected.length} articles moved to draft`);
      } else if (bulkAction === "delete") {
        await onBulkDelete(selected);
        toast.success(`${selected.length} articles deleted`);
      }
      setSelected([]);
      setBulkAction(null);
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
      await onDelete(deleteId);
      toast.success("Article deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5">
        <input
          type="text"
          placeholder="Search by title..."
          value={filters.search}
          onChange={(e) => {
            onFiltersChange({ ...filters, search: e.target.value });
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a2b4c] focus:outline-none"
        />
        <select
          value={filters.categoryId}
          onChange={(e) => {
            onFiltersChange({ ...filters, categoryId: e.target.value });
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {categories
            .filter((c) => c.slug !== "home")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameHi} / {c.nameEn}
              </option>
            ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => {
            onFiltersChange({ ...filters, status: e.target.value as NewsFilters["status"] });
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={filters.flag}
          onChange={(e) => {
            onFiltersChange({ ...filters, flag: e.target.value as NewsFilters["flag"] });
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Flags</option>
          <option value="breaking">Breaking</option>
          <option value="featured">Featured</option>
          <option value="trending">Trending</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => {
            onFiltersChange({ ...filters, sort: e.target.value as NewsFilters["sort"] });
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="mostViewed">Most Viewed</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#1a2b4c]/5 p-3">
          <span className="text-sm font-medium text-[#1a2b4c]">{selected.length} selected</span>
          <button
            onClick={() => setBulkAction("publish")}
            className="rounded bg-green-600 px-3 py-1 text-xs font-bold text-white"
          >
            Publish
          </button>
          <button
            onClick={() => setBulkAction("draft")}
            className="rounded bg-yellow-600 px-3 py-1 text-xs font-bold text-white"
          >
            Draft
          </button>
          {canBulkDelete(adminUser?.role) && (
            <button
              onClick={() => setBulkAction("delete")}
              className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No articles match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.length === paginated.length && paginated.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Image</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Title</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Views</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Published</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(article.id)}
                        onChange={() => toggleSelect(article.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {article.imageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: article.imageLargeUrl || article.imageUrl,
                              largeUrl: article.imageLargeUrl,
                              title: article.titleEn || article.titleHi,
                              alt: article.imageAltEn || article.imageAltHi || article.titleHi,
                            })
                          }
                          className="relative block h-10 w-14 overflow-hidden rounded ring-offset-1 transition hover:ring-2 hover:ring-[#1a2b4c]/30 focus:outline-none focus:ring-2 focus:ring-[#1a2b4c]"
                          title="Click to view full image"
                        >
                          <Image src={article.imageUrl} alt="" fill className="object-cover" sizes="56px" />
                        </button>
                      ) : (
                        <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">N/A</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 font-medium">{article.titleHi}</p>
                      <p className="line-clamp-1 text-xs text-gray-500">{article.titleEn}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{article.categoryNameHi}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{article.views}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTime(getArticlePublishDate(article), "en")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/article/${article.slug}`}
                          target="_blank"
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/admin/news/${article.id}/edit`}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Link>
                        {canDeleteNews(adminUser?.role) && (
                          <button
                            onClick={() => setDeleteId(article.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({filtered.length} articles)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border p-1.5 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border p-1.5 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={processing}
      />

      <ConfirmModal
        open={!!bulkAction}
        title={`Bulk ${bulkAction}`}
        message={`Are you sure you want to ${bulkAction} ${selected.length} selected article(s)?`}
        confirmLabel={bulkAction === "delete" ? "Delete All" : "Confirm"}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkAction(null)}
        loading={processing}
      />

      <ImagePreviewModal
        open={!!previewImage}
        imageUrl={previewImage?.url ?? ""}
        alt={previewImage?.alt}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
