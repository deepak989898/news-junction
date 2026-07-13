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
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-[#1a2b4c]">
        {language === "hi"
          ? "राज्य पेज स्थानीय और राज्य-स्तरीय खबरों के लिए है — विषय श्रेणी (खेल, व्यापार आदि) अलग रहती है।"
          : "The State page shows geo-based news — subject categories (Sports, Business, etc.) stay separate."}
        {!location && (
          <span className="ml-1 font-medium">
            {language === "hi" ? "अपना राज्य चुनने के लिए हेडर में क्षेत्र चुनें।" : "Select your area from the header."}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {majorStates.map((s) => (
          <Link
            key={s.id}
            href={`/state/${s.slug}`}
            className="rounded-full border border-[#1a2b4c]/20 px-3 py-1 text-xs hover:bg-[#1a2b4c]/5"
          >
            {language === "hi" ? s.nameHi : s.nameEn}
          </Link>
        ))}
      </div>

      {sections.map((section) => (
        <section key={section.key}>
          <h2 className="mb-4 text-lg font-bold text-[#1a2b4c]">
            {language === "hi" ? section.titleHi : section.titleEn}
          </h2>
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
