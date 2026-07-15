"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewsArticle } from "@/types";
import { getArticleTitle, getArticleSummary, formatRelativeTime, toDate } from "@/lib/utils";
import Link from "next/link";
import NewsArticleImage from "./NewsArticleImage";
import NewsCard from "./NewsCard";

interface FeaturedNewsProps {
  /** Articles shown in the auto-rotating hero slider */
  articles: NewsArticle[];
  /** Smaller list shown alongside the hero */
  sideArticles: NewsArticle[];
}

const AUTOPLAY_MS = 5000;

export default function FeaturedNews({ articles, sideArticles }: FeaturedNewsProps) {
  const { language, t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = articles.filter(Boolean);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div
        className="group relative overflow-hidden rounded-xl lg:col-span-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((article, i) => {
            const title = getArticleTitle(article, language);
            const summary = getArticleSummary(article, language);
            const categoryName =
              language === "hi" ? article.categoryNameHi : article.categoryNameEn;
            const publishedDate = formatRelativeTime(toDate(article.publishedAt), language);
            const imageAlt = language === "hi" ? article.imageAltHi : article.imageAltEn;
            return (
              <Link
                key={article.id}
                href={`/article/${article.slug}`}
                className="relative w-full shrink-0"
              >
                <div className="relative aspect-[16/10] md:aspect-[16/9]">
                  {article.imageUrl ? (
                    <NewsArticleImage
                      src={article.imageUrl}
                      alt={imageAlt || title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority={i === 0}
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
                  <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-tight text-white md:text-3xl">
                    {title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-200 md:text-base">{summary}</p>
                  <p className="mt-3 text-xs text-gray-300">
                    {t.by} {article.author} · {publishedDate}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        {sideArticles.map((article) => (
          <NewsCard key={article.id} article={article} variant="hero-side" />
        ))}
      </div>
    </section>
  );
}
