"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { NewsArticle } from "@/types";
import { getArticleTitle, getArticleSummary, formatRelativeTime, toDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import NewsCard from "./NewsCard";

interface FeaturedNewsProps {
  featured: NewsArticle | null;
  sideArticles: NewsArticle[];
}

export default function FeaturedNews({ featured, sideArticles }: FeaturedNewsProps) {
  const { language, t } = useLanguage();

  if (!featured) return null;

  const title = getArticleTitle(featured, language);
  const summary = getArticleSummary(featured, language);
  const categoryName =
    language === "hi" ? featured.categoryNameHi : featured.categoryNameEn;
  const publishedDate = formatRelativeTime(toDate(featured.publishedAt), language);
  const imageAlt = language === "hi" ? featured.imageAltHi : featured.imageAltEn;

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <Link
        href={`/article/${featured.slug}`}
        className="group relative overflow-hidden rounded-xl lg:col-span-2"
      >
        <div className="relative aspect-[16/10] md:aspect-[16/9]">
          {featured.imageUrl ? (
            <Image
              src={featured.imageUrl}
              alt={imageAlt || title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-200">
              <span className="text-gray-400">No Image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
          <span className="inline-block rounded bg-[#c41e20] px-2 py-0.5 text-xs font-bold uppercase text-white">
            {categoryName}
          </span>
          <h2 className="mt-3 text-xl font-bold leading-tight text-white md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-gray-200 md:text-base">{summary}</p>
          <p className="mt-3 text-xs text-gray-300">
            {t.by} {featured.author} · {publishedDate}
          </p>
        </div>
      </Link>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        {sideArticles.map((article) => (
          <NewsCard key={article.id} article={article} variant="hero-side" />
        ))}
      </div>
    </section>
  );
}
