import { PersonalizationSettings, UserPreferenceProfile } from "./types";

export const PERSONALIZATION_SETTINGS_DOC_ID = "personalizationSettings";

export const DEFAULT_PERSONALIZATION_SETTINGS: PersonalizationSettings = {
  enabled: true,
  homepageRecommendations: true,
  digestEnabled: true,
  smartNotifications: true,
  allowAnonymousRecommendations: true,
  maxRecommendations: 20,
  recommendationRefreshInterval: 30,
  updatedAt: null,
};

export function defaultUserPreferences(uid: string): UserPreferenceProfile {
  return {
    uid,
    preferredLanguage: "hi",
    preferredCategories: [],
    followedTopics: [],
    followedAuthors: [],
    followedLocations: [],
    notificationPreferences: {
      breaking: true,
      followedCategories: true,
      followedTopics: true,
      followedAuthors: true,
      dailyDigest: false,
      weeklyDigest: false,
    },
    themePreference: "system",
    fontPreference: "medium",
    readingWidth: "comfortable",
    compactMode: false,
    personalizationEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}
