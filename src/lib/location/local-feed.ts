import { UserPreferredLocation } from "./types";
import { getNearbyCityIds } from "./service";

export interface LocalFeedSection {
  id: string;
  titleHi: string;
  titleEn: string;
  articles: import("@/types").NewsArticle[];
  isFallback?: boolean;
  fallbackLabelHi?: string;
  fallbackLabelEn?: string;
}

export function buildLocalFeedPlan(location: UserPreferredLocation | null) {
  if (!location) {
    return {
      sections: ["national", "stateHighlights", "international"],
      nearbyCityIds: [] as string[],
    };
  }
  const nearbyCityIds = location.cityId ? getNearbyCityIds(location.cityId) : [];
  return {
    sections: ["city", "district", "nearby", "state", "national", "international"],
    nearbyCityIds,
    stateId: location.stateId,
    districtId: location.districtId,
    cityId: location.cityId,
  };
}
