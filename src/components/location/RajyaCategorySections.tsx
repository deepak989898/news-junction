"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferredLocation } from "@/contexts/LocationContext";
import {
  getRajyaCategoryNews,
  getNewsByStateId,
  getNewsByDistrictId,
  getNewsByCityId,
} from "@/firebase/firestore";
import { getAllStates, getStateById } from "@/lib/location/service";
import { NewsArticle } from "@/types";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SectionHeading from "@/components/ui/SectionHeading";
import Link from "next/link";

export default function RajyaCategorySections() {
  const { language } = useLanguage();
  const { location } = usePreferredLocation();
  const [allRegional, setAllRegional] = useState<NewsArticle[]>([]);
  const [userStateNews, setUserStateNews] = useState<NewsArticle[]>([]);
  const [districtNews, setDistrictNews] = useState<NewsArticle[]>([]);
  const [cityNews, setCityNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const majorStates = useMemo(() => getAllStates().slice(0, 6), []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [regional, stateItems, districtItems, cityItems] = await Promise.all([
          getRajyaCategoryNews(40),
          location?.stateId ? getNewsByStateId(location.stateId, 12) : Promise.resolve([]),
          location?.districtId ? getNewsByDistrictId(location.districtId, 8) : Promise.resolve([]),
          location?.cityId ? getNewsByCityId(location.cityId, 8) : Promise.resolve([]),
        ]);
        setAllRegional(regional);
        setUserStateNews(stateItems);
        setDistrictNews(districtItems);
        setCityNews(cityItems);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location]);

  const otherStateNews = useMemo(() => {
    if (!location?.stateId) return allRegional.slice(0, 12);
    return allRegional.filter((a) => a.stateId && a.stateId !== location.stateId).slice(0, 12);
  }, [allRegional, location?.stateId]);

  if (loading) return <LoadingSpinner />;

  const userState = location?.stateId ? getStateById(location.stateId) : null;

  const sections: {
    key: string;
    titleHi: string;
    titleEn: string;
    articles: NewsArticle[];
  }[] = [];

  if (userState && userStateNews.length > 0) {
    sections.push({
      key: "your-state",
      titleHi: "आपके राज्य की खबरें",
      titleEn: `News from ${userState.nameEn}`,
      articles: userStateNews,
    });
  }

  sections.push({
    key: "major-states",
    titleHi: "प्रमुख राज्यों की खबरें",
    titleEn: "News from major states",
    articles: allRegional.slice(0, 12),
  });

  if (districtNews.length > 0) {
    sections.push({
      key: "district",
      titleHi: "जिलेवार खबरें",
      titleEn: "District news",
      articles: districtNews,
    });
  }

  if (cityNews.length > 0) {
    sections.push({
      key: "city",
      titleHi: "शहर की ताजा खबरें",
      titleEn: "Latest city news",
      articles: cityNews,
    });
  }

  if (otherStateNews.length > 0) {
    sections.push({
      key: "other-states",
      titleHi: "अन्य राज्यों की खबरें",
      titleEn: "News from other states",
      articles: otherStateNews,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {majorStates.map((s) => (
          <Link
            key={s.id}
            href={`/state/${s.slug}`}
            className="rounded-full border border-[#1a2b4c]/25 px-3 py-1 text-xs font-semibold text-[#1a2b4c] transition-colors hover:border-[#c41e20] hover:bg-[#c41e20] hover:text-white"
          >
            {language === "hi" ? s.nameHi : s.nameEn}
          </Link>
        ))}
      </div>

      {sections.map((section) => (
        <section key={section.key}>
          <SectionHeading size="text-lg" className="mb-4">
            {language === "hi" ? section.titleHi : section.titleEn}
          </SectionHeading>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            {section.articles.map((article) => (
              <NewsCard key={article.id} article={article} variant="horizontal" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
