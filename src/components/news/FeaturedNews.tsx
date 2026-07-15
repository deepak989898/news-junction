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
  // Clamp during render so we never depend on a state-reset effect.
  const active = count > 0 ? ((index % count) + count) % count : 0;

  // Auto-advance. Keyed on `active` so the timer restarts after each slide and
  // after manual navigation, giving a consistent, reliable cadence.
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setTimeout(() => setIndex((i) => i + 1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [active, count, paused]);

  if (count === 0) return null;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div
        className="group relative overflow-hidden rounded-xl aspect-[16/10] md:aspect-[16/9] lg:col-span-2 lg:aspect-auto lg:min-h-[360px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="absolute inset-0 flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
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
                className="relative h-full w-full shrink-0"
              >
                <div className="relative h-full w-full">
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
                <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 md:p-8 md:pb-14">
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
              onClick={() => go(active - 1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/45 px-3 py-2 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === active}
                  className={`pointer-events-auto h-2.5 rounded-full transition-all ${
                    i === active ? "w-7 bg-white" : "w-2.5 bg-white/70 hover:bg-white"
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
