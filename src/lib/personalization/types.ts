export interface UserPreferenceProfile {
  uid: string;
  preferredLanguage?: "hi" | "en";
  preferredLocation?: {
    stateId: string;
    districtId?: string;
    cityId?: string;
    selectedAt: string;
    source: "manual" | "browser";
    preferredLanguage?: "hi" | "en";
  };
  preferredCategories: string[];
  followedTopics: string[];
  followedAuthors: string[];
  followedLocations: string[];
  notificationPreferences: {
    breaking: boolean;
    followedCategories: boolean;
    followedTopics: boolean;
    followedAuthors: boolean;
    dailyDigest: boolean;
    weeklyDigest: boolean;
  };
  themePreference: "light" | "dark" | "system";
  fontPreference: "small" | "medium" | "large";
  readingWidth: "compact" | "comfortable" | "wide";
  compactMode: boolean;
  personalizationEnabled: boolean;
  updatedAt: string;
}

export interface UserReadingHistoryItem {
  id?: string;
  uid: string;
  articleId: string;
  categoryId?: string;
  categoryName?: string;
  topicTags?: string[];
  viewedAt: string;
  readingTimeSec: number;
  completed: boolean;
  lastVisitedAt: string;
}

export interface UserBookmarkItem {
  id?: string;
  uid: string;
  articleId: string;
  title: string;
  slug: string;
  categoryName?: string;
  language?: "hi" | "en";
  createdAt: string;
}

export interface UserFollow {
  uid: string;
  categories: string[];
  topics: string[];
  authors: string[];
  locations: string[];
  updatedAt: string;
}

export interface PersonalizedRecommendation {
  id?: string;
  uid: string;
  articleId: string;
  reason: string;
  score: number;
  sourceSignals: string[];
  createdAt: string;
  clicked?: boolean;
  clickedAt?: string;
}

export interface UserDigest {
  id?: string;
  uid: string;
  digestType:
    | "morning"
    | "evening"
    | "weekly"
    | "technology"
    | "business"
    | "sports"
    | "entertainment";
  articleIds: string[];
  title: string;
  summary: string;
  createdAt: string;
}

export interface PersonalizationSettings {
  enabled: boolean;
  homepageRecommendations: boolean;
  digestEnabled: boolean;
  smartNotifications: boolean;
  allowAnonymousRecommendations: boolean;
  maxRecommendations: number;
  recommendationRefreshInterval: number;
  updatedAt?: string | null;
}

export interface PersonalizationAdminDashboard {
  recommendationUsage: number;
  bookmarksCount: number;
  followCounts: {
    categories: number;
    topics: number;
    authors: number;
    locations: number;
  };
  notificationSubscriptions: number;
  digestSubscribers: number;
  mostFollowedCategories: { key: string; count: number }[];
  mostFollowedTopics: { key: string; count: number }[];
  recommendationCtr: number;
  logs: Record<string, unknown>[];
}
