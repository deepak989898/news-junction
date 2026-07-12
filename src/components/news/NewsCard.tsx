"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { NewsArticle } from "@/types";
import {
  getArticleTitle,
  getArticleSummary,
  formatRelativeTime,
  toDate,
  cn,
} from "@/lib/utils";
import NewsArticleImage from "./NewsArticleImage";
import Link from "next/link";

interface NewsCardProps {
  article: NewsArticle;
  variant?: "default" | "horizontal" | "compact" | "hero-side";
  showImage?: boolean;
  className?: string;
}

export default function NewsCard({
  article,
  variant = "default",
  showImage = true,
  className,
}: NewsCardProps) {
  const { language, t } = useLanguage();
  const title = getArticleTitle(article, language);
  const summary = getArticleSummary(article, language);
  const categoryName = language === "hi" ? article.categoryNameHi : article.categoryNameEn;
  const publishedDate = formatRelativeTime(toDate(article.publishedAt), language);
  const imageAlt = language === "hi" ? article.imageAltHi : article.imageAltEn;

  if (variant === "hero-side") {
    return (
      <Link
        href={`/article/${article.slug}`}
        className={cn("group flex gap-3 border-b border-gray-100 py-3 last:border-0", className)}
      >
        {showImage && article.imageUrl && (
          <div className="relative h-20 w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-36">
            <NewsArticleImage
              src={article.imageUrl}
              alt={imageAlt || title}
              fill
              className="transition-transform group-hover:scale-105"
              sizes="144px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase text-[#c41e20]">{categoryName}</span>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[#1a2b4c] group-hover:text-[#c41e20]">
            {title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{publishedDate}</p>
        </div>
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link
        href={`/article/${article.slug}`}
        className={cn("group flex gap-4 border-b border-gray-100 py-4 last:border-0", className)}
      >
        {showImage && article.imageUrl && (
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-gray-100 md:h-28 md:w-44">
            <NewsArticleImage
              src={article.imageUrl}
              alt={imageAlt || title}
              fill
              className="transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 160px, 176px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase text-[#c41e20]">{categoryName}</span>
          <h3 className="mt-1 line-clamp-2 text-base font-bold text-[#1a2b4c] group-hover:text-[#c41e20] md:text-lg">
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{summary}</p>
          <p className="mt-2 text-xs text-gray-500">
            {article.author} · {publishedDate}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/article/${article.slug}`}
        className={cn("group block", className)}
      >
        {showImage && article.imageUrl && (
          <div className="relative mb-2 aspect-[16/9] overflow-hidden rounded-lg bg-gray-100">
            <NewsArticleImage
              src={article.imageUrl}
              alt={imageAlt || title}
              fill
              className="transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 200px"
            />
          </div>
        )}
        <span className="text-xs font-semibold uppercase text-[#c41e20]">{categoryName}</span>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-[#1a2b4c] group-hover:text-[#c41e20]">
          {title}
        </h3>
      </Link>
    );
  }

  return (
    <Link
      href={`/article/${article.slug}`}
      className={cn("group block overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md", className)}
    >
      {showImage && article.imageUrl && (
        <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
          <NewsArticleImage
            src={article.imageUrl}
            alt={imageAlt || title}
            fill
            className="transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}
      <div className="p-4">
        <span className="text-xs font-semibold uppercase text-[#c41e20]">{categoryName}</span>
        <h3 className="mt-1 line-clamp-2 text-base font-bold text-[#1a2b4c] group-hover:text-[#c41e20]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{summary}</p>
        <p className="mt-3 text-xs text-gray-500">
          {t.by} {article.author} · {publishedDate}
        </p>
      </div>
    </Link>
  );
}
