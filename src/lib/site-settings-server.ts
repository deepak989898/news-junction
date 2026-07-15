import { cache } from "react";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_SITE_SETTINGS, SETTINGS_DOC_ID } from "@/lib/settings-defaults";
import type { SiteSettings } from "@/types";

/**
 * Server-side read of the public site settings (settings/site) using the Admin SDK.
 * Wrapped in React cache() so multiple components in one request share a single read.
 */
export const getSiteSettingsServer = cache(async (): Promise<SiteSettings> => {
  try {
    const db = getAdminDb();
    const snap = await db.collection("settings").doc(SETTINGS_DOC_ID).get();
    if (snap.exists) {
      return { ...DEFAULT_SITE_SETTINGS, ...(snap.data() as Partial<SiteSettings>) };
    }
    const legacy = await db.collection("settings").doc("general").get();
    if (legacy.exists) {
      return { ...DEFAULT_SITE_SETTINGS, ...(legacy.data() as Partial<SiteSettings>) };
    }
    return DEFAULT_SITE_SETTINGS;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
});
