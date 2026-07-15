"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferredLocation } from "@/contexts/LocationContext";
import { getPersonalizedLocalFeed, LocalFeedSectionResult } from "@/firebase/firestore";
import { getStateById } from "@/lib/location/service";
import { fetchDistrictsByState, fetchCitiesByState } from "@/lib/location/client-api";
import NewsCard from "@/components/news/NewsCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import LocationSelector from "@/components/location/LocationSelector";
import SectionHeading from "@/components/ui/SectionHeading";

export default function MyNewsPage() {
  const { language } = useLanguage();
  const { location, loaded } = usePreferredLocation();
  const [sections, setSections] = useState<LocalFeedSectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaLabel, setAreaLabel] = useState("");

  useEffect(() => {
    if (!loaded) return;
    if (!location) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [data, districts, cities] = await Promise.all([
        getPersonalizedLocalFeed({
          stateId: location.stateId,
          districtId: location.districtId,
          cityId: location.cityId,
          nearbyCityIds: location.nearbyCityIds || [],
        }),
        location.districtId
          ? fetchDistrictsByState(location.stateId).catch(() => [])
          : Promise.resolve([]),
        location.cityId
          ? fetchCitiesByState(location.stateId).catch(() => [])
          : Promise.resolve([]),
      ]);
      setSections(data);
      const state = getStateById(location.stateId);
      const district = districts.find((d) => d.id === location.districtId);
      const city = cities.find((c) => c.id === location.cityId);
      const parts = [
        city ? (language === "hi" ? city.nameHi : city.nameEn) : null,
        district ? (language === "hi" ? district.nameHi : district.nameEn) : null,
        state ? (language === "hi" ? state.nameHi : state.nameEn) : null,
      ].filter(Boolean);
      setAreaLabel(parts.join(", "));
      setLoading(false);
    })();
  }, [location, loaded, language]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionHeading as="h1" size="text-3xl">
          {language === "hi" ? "मेरी खबरें" : "My News"}
        </SectionHeading>
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

      {location && areaLabel && (
        <p className="mb-6 text-sm text-gray-600">
          {language === "hi" ? "आपका क्षेत्र: " : "Your area: "}
          {areaLabel}
        </p>
      )}

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id}>
              <SectionHeading size="text-lg" bar={false} className="mb-3">
                {language === "hi" ? section.titleHi : section.titleEn}
              </SectionHeading>
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
