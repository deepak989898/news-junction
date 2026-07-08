"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SiteSettings } from "@/types";
import { getSettings } from "@/firebase/firestore";
import { DEFAULT_SITE_SETTINGS } from "@/lib/settings-defaults";

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch {
      setSettings(DEFAULT_SITE_SETTINGS);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
