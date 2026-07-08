"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCategories } from "@/firebase/firestore";
import { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function CategoryNav() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>(
    DEFAULT_CATEGORIES.filter((c) => c.slug !== "home" && c.isActive)
  );

  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats.filter((c) => c.slug !== "home")))
      .catch(() => {});
  }, []);

  return (
    <nav className="border-b border-gray-200 bg-[#1a2b4c]">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4">
        <ul className="flex min-w-max items-center gap-0">
          <li>
            <Link
              href="/"
              className={cn(
                "block whitespace-nowrap px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10",
                pathname === "/" && "border-b-2 border-[#c41e20] bg-white/5"
              )}
            >
              {language === "hi" ? "होम" : "Home"}
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/category/${cat.slug}`}
                className={cn(
                  "block whitespace-nowrap px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10",
                  pathname === `/category/${cat.slug}` && "border-b-2 border-[#c41e20] bg-white/5"
                )}
              >
                {language === "hi" ? cat.nameHi : cat.nameEn}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
