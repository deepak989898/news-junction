"use client";

import { useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

const FAVICON_VERSION = "5";

function resolveFaviconHref(faviconUrl?: string): string {
  const localRound =
    !faviconUrl ||
    faviconUrl === "/logo.png" ||
    faviconUrl.endsWith("/logo.png") ||
    faviconUrl.includes("firebasestorage.googleapis.com");

  const base = localRound ? "/favicon.ico" : faviconUrl;
  return base.includes("?") ? base : `${base}?v=${FAVICON_VERSION}`;
}

/** Applies round site favicon in the browser tab and busts stale cache. */
export default function FaviconHead() {
  const { settings } = useSettings();

  useEffect(() => {
    const href = resolveFaviconHref(settings.faviconUrl);

    document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove());

    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = href.includes(".ico") ? "image/x-icon" : "image/png";
    icon.href = href;
    document.head.appendChild(icon);

    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = `/apple-icon.png?v=${FAVICON_VERSION}`;
    document.head.appendChild(apple);
  }, [settings.faviconUrl]);

  return null;
}
