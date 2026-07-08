"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBreakingNews } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { getArticleTitle } from "@/lib/utils";
import Link from "next/link";

export default function BreakingTicker() {
  const { language, t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    getBreakingNews(5)
      .then(setArticles)
      .catch(() => setArticles([]));
  }, []);

  useEffect(() => {
    if (articles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [articles.length]);

  if (articles.length === 0) return null;

  const current = articles[currentIndex];
  const title = getArticleTitle(current, language);

  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200">
      <div className="shrink-0 bg-[#c41e20] px-4 py-2 text-xs font-bold uppercase text-white md:px-6 md:text-sm">
        {t.breakingNews}
      </div>
      <div className="flex-1 overflow-hidden px-4 py-2">
        <Link
          href={`/article/${current.slug}`}
          className="block truncate text-sm font-medium text-[#1a2b4c] hover:text-[#c41e20] transition-colors"
        >
          {title}
        </Link>
      </div>
      {articles.length > 1 && (
        <div className="hidden shrink-0 gap-1 px-4 md:flex">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-[#c41e20]" : "bg-gray-300"
              }`}
              aria-label={`Breaking news ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
