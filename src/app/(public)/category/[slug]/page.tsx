"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getNewsByCategory, getPopularNews, getCategories } from "@/firebase/firestore";
import { Category, NewsArticle } from "@/types";
import NewsCard from "@/components/news/NewsCard";
import PopularNews from "@/components/news/PopularNews";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Link from "next/link";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [popular, setPopular] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<Category | null>(null);
  const categoryName = category
    ? language === "hi" ? category.nameHi : category.nameEn
    : slug;

  useEffect(() => {
    getCategories().then((cats) => setCategory(cats.find((c) => c.slug === slug) || null));
  }, [slug]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [categoryNews, popularNews] = await Promise.all([
          getNewsByCategory(slug),
          getPopularNews(5),
        ]);
        setArticles(categoryNews);
        setPopular(popularNews);
      } catch (error) {
        console.error("Failed to load category:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#c41e20]">
          {language === "hi" ? "होम" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#1a2b4c] font-medium">{categoryName}</span>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-[#1a2b4c]">{categoryName}</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {articles.length > 0 ? (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} variant="horizontal" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <p className="text-gray-500">
                {language === "hi"
                  ? "इस श्रेणी में अभी कोई खबर नहीं है।"
                  : "No articles in this category yet."}
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <AdSlotRenderer location="sidebar" />
          <PopularNews articles={popular} />
        </aside>
      </div>
    </div>
  );
}
