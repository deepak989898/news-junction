"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Newspaper, FileText, Eye, CheckCircle, Zap, Star, TrendingUp, FolderOpen,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import StatsCard from "@/components/admin/StatsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StatusBadge from "@/components/admin/StatusBadge";
import { getDashboardStats, getRecentNews } from "@/firebase/firestore";
import { DashboardStats, NewsArticle } from "@/types";
import { formatRelativeTime, toDate, getArticleTitle } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPublished, setRecentPublished] = useState<NewsArticle[]>([]);
  const [recentDrafts, setRecentDrafts] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getRecentNews("published", 5),
      getRecentNews("draft", 5),
    ])
      .then(([s, pub, draft]) => {
        setStats(s);
        setRecentPublished(pub);
        setRecentDrafts(draft);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <AdminTopbar title="Dashboard" hideBack />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total News" value={stats?.totalNews || 0} icon={Newspaper} color="navy" />
        <StatsCard title="Published" value={stats?.publishedNews || 0} icon={CheckCircle} color="green" />
        <StatsCard title="Drafts" value={stats?.draftNews || 0} icon={FileText} color="red" />
        <StatsCard title="Total Views" value={stats?.totalViews || 0} icon={Eye} color="blue" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Breaking" value={stats?.breakingNews || 0} icon={Zap} color="red" />
        <StatsCard title="Featured" value={stats?.featuredNews || 0} icon={Star} color="navy" />
        <StatsCard title="Trending" value={stats?.trendingNews || 0} icon={TrendingUp} color="green" />
        <StatsCard title="Categories" value={stats?.totalCategories || 0} icon={FolderOpen} color="blue" />
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-[#1a2b4c]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/news/new" className="rounded-lg bg-[#c41e20] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a01820]">
            + Add News
          </Link>
          <Link href="/admin/categories" className="rounded-lg border border-[#1a2b4c] px-5 py-2.5 text-sm font-bold text-[#1a2b4c] hover:bg-[#1a2b4c] hover:text-white">
            Manage Categories
          </Link>
          <Link href="/admin/sources" className="rounded-lg border border-[#1a2b4c] px-5 py-2.5 text-sm font-bold text-[#1a2b4c] hover:bg-[#1a2b4c] hover:text-white">
            Manage Sources
          </Link>
          <Link href="/admin/settings" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Settings
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-[#1a2b4c]">Recent Published</h3>
          {recentPublished.length === 0 ? (
            <p className="text-sm text-gray-500">No published articles yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentPublished.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                  <Link href={`/admin/news/${a.id}/edit`} className="line-clamp-1 text-sm font-medium hover:text-[#c41e20]">
                    {getArticleTitle(a, "hi")}
                  </Link>
                  <span className="shrink-0 text-xs text-gray-500">{formatRelativeTime(toDate(a.publishedAt), "en")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-[#1a2b4c]">Recent Drafts</h3>
          {recentDrafts.length === 0 ? (
            <p className="text-sm text-gray-500">No drafts.</p>
          ) : (
            <ul className="space-y-3">
              {recentDrafts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0">
                  <Link href={`/admin/news/${a.id}/edit`} className="line-clamp-1 text-sm font-medium hover:text-[#c41e20]">
                    {getArticleTitle(a, "hi")}
                  </Link>
                  <StatusBadge status="draft" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
