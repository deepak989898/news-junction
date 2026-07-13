"use client";

import { useEffect, useState } from "react";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferredLocation } from "@/contexts/LocationContext";
import { getPersonalizedLocalFeed, LocalFeedSectionResult } from "@/firebase/firestore";
import Link from "next/link";

export default function LocalNewsFeed() {
  const { language } = useLanguage();
  const { location, loaded } = usePreferredLocation();
  const [sections, setSections] = useState<LocalFeedSectionResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!location) {
      setSections([]);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const data = await getPersonalizedLocalFeed({
          stateId: location?.stateId,
          districtId: location?.districtId,
          cityId: location?.cityId,
          nearbyCityIds: location?.nearbyCityIds || [],
        });
        setSections(data);
      } catch (error) {
        console.error("Failed to load local feed:", error);
        setSections([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location, loaded]);

  if (!loaded || !location) return null;

  if (loading) {
    return (
      <section className="mt-10">
        <LoadingSpinner />
      </section>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="mt-10 space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1a2b4c] border-b-2 border-[#c41e20] pb-1 inline-block">
          {language === "hi" ? "आपके क्षेत्र की खबरें" : "News from your area"}
        </h2>
        <Link href="/my-news" className="text-sm text-[#c41e20] hover:underline">
          {language === "hi" ? "सभी देखें" : "View all"}
        </Link>
      </div>

      {sections.map((section) => (
        <section key={section.id}>
          <h3 className="mb-3 text-lg font-semibold text-[#1a2b4c]">
            {language === "hi" ? section.titleHi : section.titleEn}
            {section.isFallback && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({language === "hi" ? "फ़ॉलबैक" : "fallback"})
              </span>
            )}
          </h3>
          {section.emptyMessageHi && section.articles.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              {language === "hi" ? section.emptyMessageHi : section.emptyMessageEn}
            </p>
          ) : section.articles.length > 0 ? (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              {section.articles.map((article) => (
                <NewsCard key={article.id} article={article} variant="horizontal" />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
