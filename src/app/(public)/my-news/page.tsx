"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferredLocation } from "@/contexts/LocationContext";
import { getPersonalizedLocalFeed, LocalFeedSectionResult } from "@/firebase/firestore";
import { getNearbyCityIds, getStateById, getDistrictById, getCityById } from "@/lib/location/service";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import LocationSelector from "@/components/location/LocationSelector";

export default function MyNewsPage() {
  const { language } = useLanguage();
  const { location, loaded } = usePreferredLocation();
  const [sections, setSections] = useState<LocalFeedSectionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (!location) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const data = await getPersonalizedLocalFeed({
        stateId: location.stateId,
        districtId: location.districtId,
        cityId: location.cityId,
        nearbyCityIds: location.cityId ? getNearbyCityIds(location.cityId) : [],
      });
      setSections(data);
      setLoading(false);
    })();
  }, [location, loaded]);

  const state = location?.stateId ? getStateById(location.stateId) : null;
  const district = location?.districtId ? getDistrictById(location.districtId) : null;
  const city = location?.cityId ? getCityById(location.cityId) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#1a2b4c]">
          {language === "hi" ? "मेरी खबरें" : "My News"}
        </h1>
        <LocationSelector />
      </div>

      {!location && loaded && (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-600">
            {language === "hi"
              ? "स्थानीय खबरें देखने के लिए अपना राज्य/जिला/शहर चुनें।"
              : "Select your state/district/city to see local news."}
          </p>
        </div>
      )}

      {location && (
        <p className="mb-6 text-sm text-gray-600">
          {language === "hi" ? "आपका क्षेत्र: " : "Your area: "}
          {[city?.nameHi || city?.nameEn, district?.nameHi, state?.nameHi].filter(Boolean).join(", ")}
        </p>
      )}

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-3 text-lg font-bold text-[#1a2b4c]">
                {language === "hi" ? section.titleHi : section.titleEn}
              </h2>
              {section.articles.length > 0 ? (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  {section.articles.map((a) => (
                    <NewsCard key={a.id} article={a} variant="horizontal" />
                  ))}
                </div>
              ) : section.emptyMessageHi ? (
                <p className="text-sm text-gray-500">
                  {language === "hi" ? section.emptyMessageHi : section.emptyMessageEn}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/" className="text-[#c41e20] hover:underline">
          {language === "hi" ? "← होम पर जाएं" : "← Back to home"}
        </Link>
      </div>
    </div>
  );
}
