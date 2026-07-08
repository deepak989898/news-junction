import { AnalyticsAiSettings } from "./types";

export const ANALYTICS_SETTINGS_DOC_ID = "analyticsAiSettings";

export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsAiSettings = {
  analyticsEnabled: true,
  insightsEnabled: true,
  trendDiscoveryEnabled: true,
  dailyReportEnabled: true,
  weeklyReportEnabled: true,
  monthlyReportEnabled: true,
  minimumTrafficAlert: 30,
  minimumRevenueAlert: 20,
  updatedAt: null,
};

export const ANALYTICS_ADVISORY_NOTE =
  "Analytics and growth recommendations are advisory only. If external integrations are unavailable, the dashboard shows explicit unavailable states and does not estimate missing provider data.";
