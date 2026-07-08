import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";
import { AppTheme } from "@/types/app";

type Ctx = {
  theme: AppTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (value: AppTheme) => Promise<void>;
};

const ThemeContext = createContext<Ctx>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("system");

  useEffect(() => {
    getStorageItem(STORAGE_KEYS.theme).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setThemeState(v);
    });
  }, []);

  const setTheme = async (value: AppTheme) => {
    setThemeState(value);
    await setStorageItem(STORAGE_KEYS.theme, value);
  };

  const resolvedTheme =
    theme === "system" ? (Appearance.getColorScheme() === "dark" ? "dark" : "light") : theme;

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
