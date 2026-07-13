import { UserPreferredLocation } from "./types";

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
  const nearbyCityIds = location.nearbyCityIds || [];
  return {
    sections: ["city", "district", "nearby", "state", "national", "international"],
    nearbyCityIds,
    stateId: location.stateId,
    districtId: location.districtId,
    cityId: location.cityId,
  };
}
