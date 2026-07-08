"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { NewsArticle } from "@/types";
import { getArticleTitle } from "@/lib/utils";
import Link from "next/link";

interface PopularNewsProps {
  articles: NewsArticle[];
}

export default function PopularNews({ articles }: PopularNewsProps) {
  const { language, t } = useLanguage();

  if (articles.length === 0) return null;

  return (
    <aside className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 border-b-2 border-[#c41e20] pb-2 text-lg font-bold text-[#1a2b4c]">
        {t.popularNews}
      </h2>
      <ol className="space-y-3">
        {articles.map((article, index) => (
          <li key={article.id}>
            <Link
              href={`/article/${article.slug}`}
              className="group flex items-start gap-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a2b4c] text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="line-clamp-2 text-sm font-semibold text-[#1a2b4c] group-hover:text-[#c41e20]">
                {getArticleTitle(article, language)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
