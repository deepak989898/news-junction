import { en } from "@/locales/en";
import { hi } from "@/locales/hi";
import { AppLanguage } from "@/types/app";

export const dictionaries = { en, hi };

export function t(lang: AppLanguage, key: keyof typeof en) {
  return dictionaries[lang][key] || key;
}
