export type DataSourceStatus = "enabled" | "disabled" | "unavailable" | "error";

export interface AnalyticsAiSettings {
  analyticsEnabled: boolean;
  insightsEnabled: boolean;
  trendDiscoveryEnabled: boolean;
  dailyReportEnabled: boolean;
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;
  minimumTrafficAlert: number;
  minimumRevenueAlert: number;
  updatedAt?: string | null;
}

export interface AnalyticsSourceState {
  firestore: DataSourceStatus;
  ga4: DataSourceStatus;
  searchConsole: DataSourceStatus;
  clarity: DataSourceStatus;
  firebaseAnalytics: DataSourceStatus;
}

export interface AnalyticsSummary {
  sources: AnalyticsSourceState;
  todayVisitors: number | null;
  yesterdayVisitors: number | null;
  last7DaysVisitors: number | null;
  last30DaysVisitors: number | null;
  topPages: { path: string; value: number; source: string }[];
  topCategories: { category: string; value: number }[];
  topAuthors: { author: string; value: number }[];
  topSearches: { query: string; value: number }[];
  returningUsers: number | null;
  newUsers: number | null;
  avgReadingTimeSec: number | null;
  bounceRate: number | null;
  trafficSources: { source: string; value: number }[];
  devices: { device: string; value: number }[];
  countries: { country: string; value: number }[];
  languages: { language: string; value: number }[];
  referrals: { site: string; value: number }[];
  homepageCtr: number | null;
  articleCtr: number | null;
  generatedAt: string;
  notes: string[];
}

export interface GrowthRecommendation {
  id?: string;
  articleId?: string;
  category?: string;
  title: string;
  reason: string;
  expectedBenefit: string;
  priority: "high" | "medium" | "low";
  confidence: "low" | "medium" | "high";
  recommendationType:
    | "improve_headline"
    | "improve_meta"
    | "refresh_article"
    | "add_faq"
    | "add_internal_links"
    | "follow_up_article"
    | "translate_article"
    | "generate_newsletter"
    | "generate_push"
    | "share_social"
    | "create_audio"
    | "create_video_package";
  status: "pending" | "approved" | "rejected" | "applied";
  createdAt: string;
  updatedAt: string;
}

export interface TrendSuggestion {
  id?: string;
  trendType: "trending_topic" | "emerging_category" | "keyword_opportunity" | "seasonal_interest";
  title: string;
  description: string;
  category?: string;
  keywords: string[];
  priority: "high" | "medium" | "low";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface ContentPerformanceItem {
  id?: string;
  articleId: string;
  title: string;
  category: string;
  author: string;
  views: number;
  uniqueVisitors: number | null;
  readingCompletionEstimate: number | null;
  socialShares: number | null;
  bookmarkCount: number | null;
  comments: number | null;
  avgEngagement: number | null;
  trafficTrend: "up" | "down" | "stable";
  aiQualityScore: number | null;
  editorialScore: number | null;
  seoScore: number | null;
  updatedAt: string;
}

export interface RevenueSummary {
  estimatedRevenue: number | null;
  trend: "up" | "down" | "stable";
  revenueByPage: { page: string; value: number }[];
  revenueByCategory: { category: string; value: number }[];
  revenueByDevice: { device: string; value: number }[];
  revenueByCountry: { country: string; value: number }[];
  topRevenueArticles: { articleId: string; title: string; value: number }[];
  topRevenueCategories: { category: string; value: number }[];
  topAdPositions: { position: string; value: number }[];
  placeholders: string[];
  generatedAt: string;
}

export interface AnalyticsReport {
  id?: string;
  reportType: "daily" | "weekly" | "monthly";
  dateRange: { from: string; to: string };
  traffic: Record<string, unknown>;
  seo: Record<string, unknown>;
  revenue: Record<string, unknown>;
  contentPerformance: Record<string, unknown>;
  aiActivity: Record<string, unknown>;
  editorialActivity: Record<string, unknown>;
  automationSummary: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface AnalyticsLog {
  id?: string;
  actionType:
    | "summary"
    | "growth_insights"
    | "content_performance"
    | "trend_discovery"
    | "revenue_summary"
    | "report_generate"
    | "export"
    | "snapshot"
    | "notification"
    | "error";
  status: "success" | "failed" | "pending";
  message: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}
