"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Menu, X } from "lucide-react";
import LanguageToggle from "@/components/ui/LanguageToggle";
import CategoryNav from "./CategoryNav";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import { BRAND } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";

export default function Header() {
  const { language } = useLanguage();
  const { settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const siteName = settings.siteName || BRAND.name;
  const logoUrl = settings.logoUrl || "/logo.png";

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <AdSlotRenderer location="header" className="mx-auto max-w-7xl px-4 py-1" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-[#1a2b4c] hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div className="hidden sm:block">
              <span className="text-lg font-bold leading-none">
                <span className="text-[#1a2b4c]">NEWS </span>
                <span className="text-[#c41e20]">JUNCTION</span>
              </span>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {language === "hi" ? BRAND.taglineHi : BRAND.taglineEn}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-lg p-2 text-[#1a2b4c] transition-colors hover:bg-gray-100"
            aria-label="Search"
          >
            <Search size={20} />
          </Link>
          <LanguageToggle className="hidden sm:inline-flex" />
        </div>
      </div>

      <CategoryNav />

      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white p-4 lg:hidden">
          <LanguageToggle className="mb-4 w-full" />
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-[#1a2b4c]"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Search size={18} />
            Search
          </Link>
        </div>
      )}
    </header>
  );
}
