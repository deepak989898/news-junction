"use client";

import { useEffect, useState } from "react";
import BreakingTicker from "@/components/news/BreakingTicker";
import FeaturedNews from "@/components/news/FeaturedNews";
import NewsCard from "@/components/news/NewsCard";
import PopularNews from "@/components/news/PopularNews";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getRecommendationsApi } from "@/lib/personalization/client-api";
import {
  getFeaturedNews,
  getTrendingNews,
  getLatestNews,
  getPopularNews,
} from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import LocalNewsFeed from "@/components/location/LocalNewsFeed";
import SectionHeading from "@/components/ui/SectionHeading";

export default function HomePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [featured, setFeatured] = useState<NewsArticle[]>([]);
  const [trending, setTrending] = useState<NewsArticle[]>([]);
  const [latest, setLatest] = useState<NewsArticle[]>([]);
  const [popular, setPopular] = useState<NewsArticle[]>([]);
  const [recommended, setRecommended] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [featuredData, trendingData, latestData, popularData] = await Promise.all([
          getFeaturedNews(4),
          getTrendingNews(6),
          getLatestNews(12),
          getPopularNews(5),
        ]);
        setFeatured(featuredData);
        setTrending(trendingData);
        setLatest(latestData);
        setPopular(popularData);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!user) {
      setRecommended([]);
      return;
    }
    (async () => {
      try {
        const res = (await getRecommendationsApi()) as Record<string, unknown>;
        const items = ((res.sections as Record<string, unknown> | undefined)?.recommendedForYou as Record<string, unknown>[]) || [];
        const ids = items.map((x) => String(x.articleId || ""));
        if (!ids.length) return;
        const recArticles = latest.filter((a) => ids.includes(a.id));
        setRecommended(recArticles.slice(0, 6));
      } catch {
        setRecommended([]);
      }
    })();
  }, [user, latest]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const heroPool: NewsArticle[] = [];
  const heroSeen = new Set<string>();
  for (const a of [...featured, ...latest]) {
    if (a && !heroSeen.has(a.id)) {
      heroSeen.add(a.id);
      heroPool.push(a);
    }
  }
  const heroArticles = heroPool.slice(0, 5);
  const heroIds = new Set(heroArticles.map((a) => a.id));
  const sideArticles = latest.filter((a) => !heroIds.has(a.id)).slice(0, 4);

  return (
    <>
      <BreakingTicker />

      <div className="mx-auto max-w-7xl px-4 py-4">
        {heroArticles.length > 0 ? (
          <FeaturedNews articles={heroArticles} sideArticles={sideArticles} />
        ) : (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-[#1a2b4c]">Welcome to News Junction</h2>
            <p className="mt-2 text-gray-500">
              No articles published yet. Login to admin panel to add news.
            </p>
          </div>
        )}

        <LocalNewsFeed />

        {trending.length > 0 && (
          <section className="mt-6">
            <SectionHeading className="mb-4">{t.trendingNews}</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {trending.map((article) => (
                <NewsCard key={article.id} article={article} variant="compact" />
              ))}
            </div>
          </section>
        )}

        {user && recommended.length > 0 && (
          <section className="mt-6">
            <SectionHeading className="mb-4">Recommended for You</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              {recommended.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionHeading className="mb-4">{t.latestNews}</SectionHeading>
            {latest.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {latest.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No latest news available.</p>
            )}
          </section>

          <aside className="space-y-6">
            <AdSlotRenderer location="sidebar" />
            <PopularNews articles={popular} />
          </aside>
        </div>
      </div>
    </>
  );
}
