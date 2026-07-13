"use client";

import { useState } from "react";
import { NewsArticle } from "@/types";
import { formatDateTime, getArticlePublishDate } from "@/lib/utils";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";

interface NewsTableProps {
  articles: NewsArticle[];
  onDelete: (id: string) => void;
}

export default function NewsTable({ articles, onDelete }: NewsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (articles.length === 0) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">No news articles found. Create your first article!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Image</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Title (HI/EN)</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {article.imageUrl ? (
                    <div className="relative h-12 w-16 overflow-hidden rounded">
                      <Image
                        src={article.imageUrl}
                        alt={article.titleHi}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                      N/A
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="line-clamp-1 font-medium text-[#1a2b4c]">{article.titleHi}</p>
                  <p className="line-clamp-1 text-xs text-gray-500">{article.titleEn}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{article.categoryNameHi}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      article.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {article.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {formatDateTime(getArticlePublishDate(article), "en")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/news/${article.id}/edit`}
                      className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
