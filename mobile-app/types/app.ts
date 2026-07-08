export type AppLanguage = "en" | "hi";
export type AppTheme = "light" | "dark" | "system";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface NotificationTokenPayload {
  uid: string;
  token: string;
  platform: "ios" | "android";
  updatedAt: string;
}
