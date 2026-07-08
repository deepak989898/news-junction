import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";

export type FontSize = "small" | "medium" | "large";
export type ReaderTheme = "light" | "dark" | "system";

type ReaderSettings = {
  fontSize: FontSize;
  reduceMotion: boolean;
  highContrast: boolean;
  dataSaver: boolean;
  wifiOnlyDownloads: boolean;
  lowImageMode: boolean;
  autoDownload: boolean;
  setFontSize: (v: FontSize) => Promise<void>;
  setReduceMotion: (v: boolean) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;
  setDataSaver: (v: boolean) => Promise<void>;
  setWifiOnlyDownloads: (v: boolean) => Promise<void>;
  setLowImageMode: (v: boolean) => Promise<void>;
  setAutoDownload: (v: boolean) => Promise<void>;
};

const ReaderContext = createContext<ReaderSettings | null>(null);

async function loadBool(key: string, fallback = false) {
  const v = await getStorageItem(key);
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [highContrast, setHighContrastState] = useState(false);
  const [dataSaver, setDataSaverState] = useState(false);
  const [wifiOnlyDownloads, setWifiOnlyDownloadsState] = useState(false);
  const [lowImageMode, setLowImageModeState] = useState(false);
  const [autoDownload, setAutoDownloadState] = useState(false);

  useEffect(() => {
    Promise.all([
      getStorageItem(STORAGE_KEYS.fontSize),
      loadBool(STORAGE_KEYS.reduceMotion),
      loadBool(STORAGE_KEYS.highContrast),
      loadBool(STORAGE_KEYS.dataSaver),
      loadBool(STORAGE_KEYS.wifiOnlyDownloads),
      loadBool(STORAGE_KEYS.lowImageMode),
      loadBool(STORAGE_KEYS.autoDownload),
    ]).then(([fs, rm, hc, ds, wifi, lim, ad]) => {
      if (fs === "small" || fs === "medium" || fs === "large") setFontSizeState(fs);
      setReduceMotionState(rm);
      setHighContrastState(hc);
      setDataSaverState(ds);
      setWifiOnlyDownloadsState(wifi);
      setLowImageModeState(lim);
      setAutoDownloadState(ad);
    });
  }, []);

  const value = useMemo<ReaderSettings>(
    () => ({
      fontSize,
      reduceMotion,
      highContrast,
      dataSaver,
      wifiOnlyDownloads,
      lowImageMode,
      autoDownload,
      setFontSize: async (v) => {
        setFontSizeState(v);
        await setStorageItem(STORAGE_KEYS.fontSize, v);
      },
      setReduceMotion: async (v) => {
        setReduceMotionState(v);
        await setStorageItem(STORAGE_KEYS.reduceMotion, String(v));
      },
      setHighContrast: async (v) => {
        setHighContrastState(v);
        await setStorageItem(STORAGE_KEYS.highContrast, String(v));
      },
      setDataSaver: async (v) => {
        setDataSaverState(v);
        await setStorageItem(STORAGE_KEYS.dataSaver, String(v));
        if (v) setLowImageModeState(true);
      },
      setWifiOnlyDownloads: async (v) => {
        setWifiOnlyDownloadsState(v);
        await setStorageItem(STORAGE_KEYS.wifiOnlyDownloads, String(v));
      },
      setLowImageMode: async (v) => {
        setLowImageModeState(v);
        await setStorageItem(STORAGE_KEYS.lowImageMode, String(v));
      },
      setAutoDownload: async (v) => {
        setAutoDownloadState(v);
        await setStorageItem(STORAGE_KEYS.autoDownload, String(v));
      },
    }),
    [fontSize, reduceMotion, highContrast, dataSaver, wifiOnlyDownloads, lowImageMode, autoDownload]
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReaderSettings() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReaderSettings must be used within ReaderSettingsProvider");
  return ctx;
}

export function getFontScale(size: FontSize) {
  if (size === "small") return 0.9;
  if (size === "large") return 1.2;
  return 1;
}
