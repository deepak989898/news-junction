"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("inline-flex overflow-hidden rounded-full text-xs font-bold uppercase shadow-sm", className)}>
      <button
        onClick={() => setLanguage("hi")}
        className={cn(
          "px-3 py-1.5 transition-colors",
          language === "hi"
            ? "bg-[#c41e20] text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
        aria-pressed={language === "hi"}
      >
        Hindi
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={cn(
          "px-3 py-1.5 transition-colors",
          language === "en"
            ? "bg-[#1a2b4c] text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
        aria-pressed={language === "en"}
      >
        English
      </button>
    </div>
  );
}
