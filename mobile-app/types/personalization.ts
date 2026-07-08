export interface UserBookmarkItem {
  id?: string;
  uid: string;
  articleId: string;
  title: string;
  slug: string;
  categoryName?: string;
  language?: "hi" | "en";
  folder?: string;
  createdAt: string;
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
  progress?: number;
}

export interface PersonalizedRecommendation {
  id?: string;
  uid: string;
  articleId: string;
  reason: string;
  score: number;
  sourceSignals: string[];
  createdAt: string;
}

export interface UserPreferenceProfile {
  uid: string;
  preferredLanguage?: "hi" | "en";
  preferredCategories: string[];
  followedTopics: string[];
  followedAuthors: string[];
  notificationPreferences: {
    breaking: boolean;
    followedCategories: boolean;
    dailyDigest: boolean;
    weeklyDigest: boolean;
  };
  themePreference: "light" | "dark" | "system";
  fontPreference: "small" | "medium" | "large";
  personalizationEnabled: boolean;
  updatedAt: string;
}

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  type: "breaking" | "digest" | "recommended" | "category";
  articleId?: string;
  slug?: string;
  read: boolean;
  createdAt: string;
}
