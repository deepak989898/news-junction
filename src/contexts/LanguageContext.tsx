"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Language } from "@/types";
import { TRANSLATIONS } from "@/lib/constants";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof TRANSLATIONS)[Language];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("hi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nj-language") as Language | null;
    if (saved === "hi" || saved === "en") {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("nj-language", lang);
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language === "hi" ? "hi" : "en";
    }
  }, [language, mounted]);

  const t = TRANSLATIONS[language];

  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{ language: "hi", setLanguage, t: TRANSLATIONS.hi }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
