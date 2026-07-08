export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "telegram"
  | "whatsapp_channel"
  | "youtube_community";

export type SocialQueueStatus =
  | "pending"
  | "scheduled"
  | "processing"
  | "published"
  | "failed"
  | "cancelled";

export interface SocialManagerSettings {
  autoPublishEnabled: boolean;
  requireApprovalBeforePosting: boolean;
  requireApprovalForHighRiskCategories: boolean;
  allowEditorsScheduleOnly: boolean;
  allowOnlySuperAdminImmediatePublish: boolean;
  maxRetries: number;
  businessHoursStart: number;
  businessHoursEnd: number;
  timezone: string;
  publishBreakingImmediately: boolean;
  delayEntertainmentMinutes: number;
  publishOnlyIfFeaturedImageExists: boolean;
  updatedAt?: string | null;
}

export interface SocialAccount {
  id?: string;
  platform: SocialPlatform;
  accountName: string;
  accountId?: string;
  tokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
  enabled: boolean;
  status: "connected" | "disconnected" | "expired" | "error";
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialCampaign {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  platforms: SocialPlatform[];
  categories: string[];
  status: "draft" | "active" | "paused" | "completed";
  postsGenerated: number;
  postsPublished: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostQueueItem {
  id?: string;
  articleId: string;
  platform: SocialPlatform;
  campaignId?: string;
  text: string;
  hashtags: string[];
  cta: string;
  imageUrl?: string;
  language: "hi" | "en";
  status: SocialQueueStatus;
  scheduledAt?: string;
  publishedAt?: string;
  retryCount: number;
  errorMessage?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialTemplate {
  id?: string;
  name: string;
  type:
    | "breaking_news"
    | "sports"
    | "technology"
    | "business"
    | "entertainment"
    | "health"
    | "politics"
    | "general";
  prompt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAnalytics {
  id?: string;
  articleId?: string;
  platform: SocialPlatform;
  categoryId?: string;
  impressions?: number;
  clicks?: number;
  engagement?: number;
  publishedCount?: number;
  failedCount?: number;
  dateBucket: string;
  updatedAt: string;
}

export interface SocialLog {
  id?: string;
  articleId?: string;
  queueId?: string;
  platform?: SocialPlatform;
  actionType: string;
  status: "success" | "failed" | "pending";
  message: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

export interface GeneratedSocialContent {
  facebookPost: string;
  instagramCaption: string;
  xPost: string;
  linkedinPost: string;
  telegramPost: string;
  shortPromo: string;
  longVersion: string;
  breakingVersion: string;
  hindiVersion: string;
  englishVersion: string;
  hashtags: string[];
  callToAction: string;
}
