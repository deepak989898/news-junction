"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getCategories } from "@/firebase/firestore";
import { Category } from "@/types";
import { BRAND } from "@/lib/constants";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";

export default function Footer() {
  const { language } = useLanguage();
  const { settings } = useSettings();
  const year = new Date().getFullYear();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats.filter((c) => c.slug !== "home").slice(0, 6)))
      .catch(() => {});
  }, []);

  const social = settings.socialLinks;

  return (
    <footer className="mt-auto bg-[#1a2b4c] text-white">
      <AdSlotRenderer location="footer" className="mx-auto max-w-7xl px-4 py-2" />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-xl font-bold">
              <span className="text-white">NEWS </span>
              <span className="text-[#c41e20]">JUNCTION</span>
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              {language === "hi" ? BRAND.taglineHi : BRAND.taglineEn}
            </p>
            {(social.facebook || social.instagram || social.youtube || social.x) && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Facebook</a>}
                {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">Instagram</a>}
                {social.x && <a href={social.x} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">X</a>}
                {social.youtube && <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">YouTube</a>}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#c41e20]">
              {language === "hi" ? "श्रेणियाँ" : "Categories"}
            </h4>
            <ul className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {language === "hi" ? cat.nameHi : cat.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#c41e20]">
              {language === "hi" ? "हमारे बारे में" : "About"}
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {settings.footerText ||
                (language === "hi"
                  ? "News Junction आपकी विश्वसनीय द्विभाषी समाचार वेबसाइट है।"
                  : "News Junction is your trusted bilingual news website.")}
            </p>
            {settings.contactEmail && (
              <p className="mt-2 text-sm text-gray-400">{settings.contactEmail}</p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-gray-400">
          <div className="mb-3 flex flex-wrap justify-center gap-4">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              {language === "hi" ? "गोपनीयता नीति" : "Privacy Policy"}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {language === "hi" ? "सेवा की शर्तें" : "Terms of Service"}
            </Link>
            <Link href="/user-data-deletion" className="hover:text-white transition-colors">
              {language === "hi" ? "डेटा हटाएँ" : "Data Deletion"}
            </Link>
          </div>
          {settings.footerText || `© ${year} ${settings.siteName || BRAND.name}. ${language === "hi" ? "सर्वाधिकार सुरक्षित" : "All rights reserved"}.`}
        </div>
      </div>
    </footer>
  );
}
