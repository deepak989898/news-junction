"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { searchNews } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SectionHeading from "@/components/ui/SectionHeading";

export default function SearchPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function performSearch(term: string) {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchNews(term.trim());
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    performSearch(query);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <SectionHeading as="h1" size="text-2xl" className="mb-6">{t.search}</SectionHeading>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base shadow-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]"
          />
        </div>
      </form>

      <div className="mb-6 flex gap-2">
        {[t.all, t.news, t.videos, t.photos].map((filter, i) => (
          <button
            key={filter}
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              i === 0
                ? "bg-[#1a2b4c] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : searched ? (
        results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {results.length} {results.length === 1 ? "result" : "results"} found
            </p>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              {results.map((article) => (
                <NewsCard key={article.id} article={article} variant="horizontal" />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">{t.noResults}</p>
          </div>
        )
      ) : (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <Search className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500">{t.searchPlaceholder}</p>
        </div>
      )}
    </div>
  );
}
