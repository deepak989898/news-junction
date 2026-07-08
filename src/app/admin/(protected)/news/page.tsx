"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import NewsManagementTable from "@/components/admin/NewsManagementTable";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getAllNewsForAdmin,
  getAllCategories,
  deleteNews,
  bulkUpdateNewsStatus,
  bulkDeleteNews,
} from "@/firebase/firestore";
import { NewsArticle, Category, NewsFilters } from "@/types";
import toast from "react-hot-toast";

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<NewsFilters>({
    search: "",
    categoryId: "all",
    status: "all",
    flag: "all",
    sort: "newest",
  });

  const loadData = async () => {
    try {
      const [news, cats] = await Promise.all([getAllNewsForAdmin(), getAllCategories()]);
      setArticles(news);
      setCategories(cats);
    } catch {
      toast.error("Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    await deleteNews(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleBulkStatus = async (ids: string[], status: "draft" | "published") => {
    await bulkUpdateNewsStatus(ids, status);
    await loadData();
  };

  const handleBulkDelete = async (ids: string[]) => {
    await bulkDeleteNews(ids);
    setArticles((prev) => prev.filter((a) => !ids.includes(a.id)));
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <AdminTopbar
        title="News Management"
        actions={
          <Link href="/admin/news/new" className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white hover:bg-[#a01820]">
            <Plus size={16} /> Add News
          </Link>
        }
      />

      <NewsManagementTable
        articles={articles}
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
        onDelete={handleDelete}
        onBulkStatus={handleBulkStatus}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
