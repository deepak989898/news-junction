"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getNewsByCityId, getNewsByDistrictId, getNewsByStateId, getNationalIndiaNews } from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SectionHeading from "@/components/ui/SectionHeading";
import PopularNews from "@/components/news/PopularNews";
import { getPopularNews } from "@/firebase/firestore";

interface GeoNewsListPageProps {
  titleHi: string;
  titleEn: string;
  breadcrumbs: { href?: string; labelHi: string; labelEn: string }[];
  query: { type: "state" | "district" | "city" | "national"; id: string };
  noindex?: boolean;
}

export default function GeoNewsListPage({
  titleHi,
  titleEn,
  breadcrumbs,
  query,
  noindex,
}: GeoNewsListPageProps) {
  const { language } = useLanguage();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [popular, setPopular] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let news: NewsArticle[] = [];
        if (query.type === "state") news = await getNewsByStateId(query.id, 24);
        else if (query.type === "district") news = await getNewsByDistrictId(query.id, 24);
        else if (query.type === "city") news = await getNewsByCityId(query.id, 24);
        else news = await getNationalIndiaNews(24);
        const pop = await getPopularNews(5);
        setArticles(news);
        setPopular(pop);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [query.type, query.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const title = language === "hi" ? titleHi : titleEn;
  const thin = articles.length < 3;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-2">/</span>}
            {b.href ? (
              <Link href={b.href} className="hover:text-[#c41e20]">
                {language === "hi" ? b.labelHi : b.labelEn}
              </Link>
            ) : (
              <span className="text-[#1a2b4c] font-medium">
                {language === "hi" ? b.labelHi : b.labelEn}
              </span>
            )}
          </span>
        ))}
      </nav>

      <SectionHeading as="h1" size="text-3xl" className="mb-4">{title}</SectionHeading>

      <div className="grid gap-6 lg:grid-cols-3">
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
                  ? "इस क्षेत्र में अभी पर्याप्त खबर नहीं है। राष्ट्रीय खबरें देखें।"
                  : "Not enough news for this area yet. See national news."}
              </p>
              <Link href="/india" className="mt-4 inline-block text-[#c41e20] hover:underline">
                {language === "hi" ? "देश की खबरें" : "India news"}
              </Link>
            </div>
          )}
        </section>
        <aside>
          <PopularNews articles={popular} />
        </aside>
      </div>
    </div>
  );
}
