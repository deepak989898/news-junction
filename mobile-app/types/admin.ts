export type AdminRole = "super_admin" | "editor" | "moderator" | "viewer";

export interface AdminUserProfile {
  uid: string;
  name?: string;
  email?: string;
  role: AdminRole;
  status?: "active" | "disabled";
}

export interface AdminDashboardMetrics {
  publishedToday: number;
  drafts: number;
  pendingAiReviews: number;
  pendingEditorialReviews: number;
  pendingMediaGeneration: number;
  pendingSocialPosts: number;
  pendingPushNotifications: number;
  todayVisitors: number;
  trendingArticles: Array<Record<string, unknown>>;
  aiCostToday: number;
  automationStatus: string;
  healthSummary: Record<string, unknown>;
  latestActivity: Array<Record<string, unknown>>;
}

export interface OfflineAdminAction {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload: Record<string, unknown>;
  createdAt: string;
}
