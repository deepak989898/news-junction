import { getAdminDb } from "@/lib/firebase-admin";
import { LocalNewsSettings } from "./types";

export const DEFAULT_LOCAL_NEWS_SETTINGS: LocalNewsSettings = {
  indiaNewsPercentageTarget: 95,
  internationalNewsPercentageMaximum: 5,
  nationalAllocationPercent: 35,
  stateAllocationPercent: 35,
  localAllocationPercent: 25,
  minimumCategoryCoverage: {
    desh: 10,
    rajya: 5,
    khel: 4,
    manoranjan: 4,
    technology: 3,
    vyapar: 3,
    swasthya: 2,
    duniya: 2,
  },
};

export interface DailyDistribution {
  total: number;
  india: number;
  international: number;
  indiaPercent: number;
  internationalPercent: number;
  byGeoScope: Record<string, number>;
  byCategory: Record<string, number>;
}

export async function getDailyNewsDistribution(): Promise<DailyDistribution> {
  const db = getAdminDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const snap = await db
    .collection("news")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(300)
    .get();

  let india = 0;
  let international = 0;
  const byGeoScope: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let total = 0;

  snap.docs.forEach((doc) => {
    const data = doc.data();
    const pub = data.publishedAt?.toDate?.();
    if (!pub || pub < start) return;

    total += 1;
    const isIndia = data.isIndiaNews !== false && data.geoScope !== "international";
    if (isIndia) india += 1;
    else international += 1;

    const scope = String(data.geoScope || "national");
    byGeoScope[scope] = (byGeoScope[scope] || 0) + 1;

    const cat = String(data.categoryId || "unknown");
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  return {
    total,
    india,
    international,
    indiaPercent: total ? Math.round((india / total) * 100) : 100,
    internationalPercent: total ? Math.round((international / total) * 100) : 0,
    byGeoScope,
    byCategory,
  };
}

export async function canPublishInternational(settings = DEFAULT_LOCAL_NEWS_SETTINGS): Promise<{
  allowed: boolean;
  reason?: string;
  distribution: DailyDistribution;
}> {
  const distribution = await getDailyNewsDistribution();
  if (distribution.total < 5) {
    return { allowed: true, distribution };
  }
  if (distribution.internationalPercent >= settings.internationalNewsPercentageMaximum) {
    return {
      allowed: false,
      reason: `International limit reached (${distribution.internationalPercent}% >= ${settings.internationalNewsPercentageMaximum}%)`,
      distribution,
    };
  }
  return { allowed: true, distribution };
}

export async function shouldPreferIndianNews(settings = DEFAULT_LOCAL_NEWS_SETTINGS): Promise<boolean> {
  const distribution = await getDailyNewsDistribution();
  if (distribution.total < 3) return true;
  return distribution.indiaPercent < settings.indiaNewsPercentageTarget;
}

export function shouldDeferInternationalArticle(
  geoScope: string,
  isIndiaNews: boolean,
  distribution: DailyDistribution,
  settings = DEFAULT_LOCAL_NEWS_SETTINGS
): { defer: boolean; reason?: string } {
  if (isIndiaNews || geoScope !== "international") {
    return { defer: false };
  }
  if (distribution.internationalPercent >= settings.internationalNewsPercentageMaximum) {
    return {
      defer: true,
      reason: `International quota full (${distribution.internationalPercent}%)`,
    };
  }
  return { defer: false };
}
