import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";
import { AppLanguage } from "@/types/app";
import { t as translate } from "@/services/i18n/i18n";

type Ctx = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: Parameters<typeof translate>[1]) => string;
};

const I18nContext = createContext<Ctx>({
  language: "en",
  setLanguage: async () => {},
  t: (key) => String(key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    getStorageItem(STORAGE_KEYS.language).then((v) => {
      if (v === "hi" || v === "en") setLanguageState(v);
    });
  }, []);

  const setLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    await setStorageItem(STORAGE_KEYS.language, lang);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: Parameters<typeof translate>[1]) => translate(language, key),
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
