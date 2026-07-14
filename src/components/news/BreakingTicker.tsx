"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBreakingNews } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import { getArticleTitle } from "@/lib/utils";
import Link from "next/link";

const MAX_BREAKING = 5;
const SEPARATOR = "\u00A0\u00A0●\u00A0\u00A0";

function TickerItems({
  articles,
  language,
}: {
  articles: NewsArticle[];
  language: "hi" | "en";
}) {
  return (
    <>
      {articles.map((article, index) => {
        const title = getArticleTitle(article, language);
        return (
          <span key={`${article.id}-${index}`} className="inline-flex items-center">
            <Link
              href={`/article/${article.slug}`}
              className="whitespace-nowrap text-sm font-semibold text-[#c41e20] hover:underline"
            >
              {title}
            </Link>
            <span className="select-none px-1 text-[#c41e20]/aria-hidden>
              {SEPARATOR}
            </span>
          </span>
        );
      })}
    </>
  );
}

export default function BreakingTicker() {
  const { language, t } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    getBreakingNews(MAX_BREAKING)
      .then((items) => setArticles(items.slice(0, MAX_BREAKING)))
      .catch(() => setArticles([]));
  }, []);

  const durationSec = useMemo(() => {
    // ~8–10s per headline so the loop feels like a TV news ticker
    return Math.max(28, articles.length * 9);
  }, [articles.length]);

  if (articles.length === 0) return null;

  return (
    <div
      className="breaking-ticker flex items-stretch border-b border-gray-200 bg-white"
      role="region"
      aria-label={t.breakingNews}
    >
      {/* Static label — never scrolls */}
      <div className="relative z-10 flex shrink-0 items-center bg-[#c41e20] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white md:px-5 md:text-sm">
        {t.breakingNews}
      </div>

      {/* Moving ticker track */}
      <div className="breaking-ticker-viewport relative min-w-0 flex-1 overflow-hidden py-2">
        <div
          className="breaking-ticker-track flex w-max items-center"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {/* Duplicate for seamless loop */}
          <div className="flex items-center pr-8">
            <TickerItems articles={articles} language={language} />
          </div>
          <div className="flex items-center pr-8" aria-hidden>
            <TickerItems articles={articles} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
}
