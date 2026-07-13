"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllStates } from "@/lib/location/service";
import LocationSelector from "@/components/location/LocationSelector";

export default function LocalDiscoveryPage() {
  const { language } = useLanguage();
  const states = getAllStates();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#1a2b4c]">
          {language === "hi" ? "स्थानीय समाचार" : "Local News"}
        </h1>
        <LocationSelector />
      </div>

      <p className="mb-6 text-gray-600">
        {language === "hi"
          ? "राज्य, जिला या शहर चुनकर स्थानीय खबरें पढ़ें।"
          : "Browse news by state, district or city."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {states.map((s) => (
          <Link
            key={s.id}
            href={`/state/${s.slug}`}
            className="rounded-lg border bg-white p-4 shadow-sm hover:border-[#c41e20]/40"
          >
            <span className="font-medium text-[#1a2b4c]">
              {language === "hi" ? s.nameHi : s.nameEn}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/my-news" className="text-[#c41e20] hover:underline">
          {language === "hi" ? "मेरी व्यक्तिगत फ़ीड →" : "My personalized feed →"}
        </Link>
      </div>
    </div>
  );
}
