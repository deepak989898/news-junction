"use client";

import { useEffect } from "react";

const FAVICON_VERSION = "9";
export const SITE_FAVICON_URL = `/favicon-96.png?v=${FAVICON_VERSION}`;

/** Applies the round NJ favicon in the browser tab (PNG for clarity at small sizes). */
export default function FaviconHead() {
  useEffect(() => {
    document.querySelectorAll("link[rel*='icon']").forEach((node) => node.remove());

    const png = document.createElement("link");
    png.rel = "icon";
    png.type = "image/png";
    png.sizes = "96x96";
    png.href = SITE_FAVICON_URL;
    document.head.appendChild(png);

    const shortcut = document.createElement("link");
    shortcut.rel = "shortcut icon";
    shortcut.type = "image/png";
    shortcut.href = SITE_FAVICON_URL;
    document.head.appendChild(shortcut);

    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = `/apple-icon.png?v=${FAVICON_VERSION}`;
    document.head.appendChild(apple);
  }, []);

  return null;
}
