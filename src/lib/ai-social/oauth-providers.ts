import { getSiteUrl } from "./oauth-state";
import { upsertSocialAccount } from "./service";
import { SocialPlatform } from "./types";

const FB_GRAPH = "https://graph.facebook.com/v20.0";

function requireEnv(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured in Vercel environment variables`);
  return value;
}

export function getFacebookOAuthUrl(state: string): string {
  const appId = requireEnv("FACEBOOK_APP_ID");
  const redirectUri = `${getSiteUrl()}/api/ai/social/oauth/facebook/callback`;
  const scopes = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "pages_manage_metadata",
  ].join(",");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: "code",
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

async function fbGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${FB_GRAPH}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok || (data as { error?: { message?: string } }).error) {
    throw new Error((data as { error?: { message?: string } }).error?.message || `Facebook API error ${res.status}`);
  }
  return data;
}

export async function completeFacebookOAuth(code: string) {
  const appId = requireEnv("FACEBOOK_APP_ID");
  const appSecret = requireEnv("FACEBOOK_APP_SECRET");
  const redirectUri = `${getSiteUrl()}/api/ai/social/oauth/facebook/callback`;
  const configuredPageId = (process.env.FACEBOOK_PAGE_ID || "").trim();

  const shortToken = await fbGet<{ access_token: string }>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const longToken = await fbGet<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken.access_token,
  });

  const accounts = await fbGet<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
  }>("/me/accounts", {
    access_token: longToken.access_token,
    fields: "id,name,access_token,instagram_business_account",
  });

  if (!accounts.data?.length) {
    throw new Error("No Facebook Pages found. Create a Page and grant access during login.");
  }

  const page =
    (configuredPageId && accounts.data.find((p) => p.id === configuredPageId)) ||
    accounts.data[0];

  await upsertSocialAccount({
    platform: "facebook",
    accountName: page.name,
    accountId: page.id,
    token: page.access_token,
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    enabled: true,
  });

  if (page.instagram_business_account?.id) {
    await upsertSocialAccount({
      platform: "instagram",
      accountName: `${page.name} (Instagram)`,
      accountId: page.instagram_business_account.id,
      token: page.access_token,
      scopes: ["instagram_basic", "instagram_content_publish"],
      enabled: true,
    });
  }

  return { pageName: page.name, pageId: page.id, instagramConnected: Boolean(page.instagram_business_account?.id) };
}

export async function connectTelegramBot(botToken: string) {
  const token = botToken.trim();
  if (!token) throw new Error("Bot token is required");

  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(15000),
  });
  const meData = (await meRes.json()) as { ok: boolean; result?: { id: number; username?: string; first_name?: string }; description?: string };
  if (!meData.ok || !meData.result) {
    throw new Error(meData.description || "Invalid Telegram bot token");
  }

  const channelId = requireEnv("TELEGRAM_CHANNEL_ID");
  const chatRes = await fetch(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(channelId)}`,
    { signal: AbortSignal.timeout(15000) }
  );
  const chatData = (await chatRes.json()) as { ok: boolean; result?: { title?: string; username?: string }; description?: string };
  if (!chatData.ok) {
    throw new Error(
      chatData.description ||
        "Bot cannot access the channel. Add the bot as admin to your Telegram channel and set TELEGRAM_CHANNEL_ID."
    );
  }

  const memberRes = await fetch(
    `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(channelId)}&user_id=${meData.result.id}`,
    { signal: AbortSignal.timeout(15000) }
  );
  const memberData = (await memberRes.json()) as { ok: boolean; result?: { status?: string }; description?: string };
  if (!memberData.ok) {
    throw new Error(memberData.description || "Could not verify bot membership in channel");
  }
  const status = memberData.result?.status;
  if (!status || !["administrator", "creator"].includes(status)) {
    throw new Error("Bot must be an administrator of the Telegram channel before connecting.");
  }

  const accountName = meData.result.username
    ? `@${meData.result.username}`
    : meData.result.first_name || "Telegram Bot";

  await upsertSocialAccount({
    platform: "telegram",
    accountName,
    accountId: String(meData.result.id),
    token,
    scopes: ["sendMessage", "sendPhoto"],
    enabled: true,
  });

  return {
    accountName,
    channelTitle: chatData.result?.title || chatData.result?.username || channelId,
  };
}

export type ConnectablePlatform = Extract<SocialPlatform, "facebook" | "telegram">;

export function isOAuthPlatform(platform: string): platform is ConnectablePlatform {
  return platform === "facebook" || platform === "telegram";
}

export function getPlatformConnectConfig(platform: SocialPlatform) {
  const configs: Record<
    SocialPlatform,
    { oneClick: boolean; envRequired: string[]; label: string; description: string }
  > = {
    facebook: {
      oneClick: true,
      envRequired: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_PAGE_ID"],
      label: "Facebook Page",
      description: "Login with Facebook and auto-connect your Page for posting.",
    },
    telegram: {
      oneClick: true,
      envRequired: ["TELEGRAM_CHANNEL_ID"],
      label: "Telegram Channel",
      description: "Paste bot token once — we verify channel access automatically.",
    },
    instagram: {
      oneClick: false,
      envRequired: ["FACEBOOK_APP_ID"],
      label: "Instagram",
      description: "Connects automatically when Facebook Page has linked Instagram Business account.",
    },
    x: {
      oneClick: false,
      envRequired: ["X_API_KEY", "X_API_SECRET"],
      label: "X (Twitter)",
      description: "OAuth setup coming soon. Caption generation works today.",
    },
    linkedin: {
      oneClick: false,
      envRequired: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
      label: "LinkedIn",
      description: "OAuth setup coming soon. Caption generation works today.",
    },
    whatsapp_channel: {
      oneClick: false,
      envRequired: [],
      label: "WhatsApp Channel",
      description: "Coming soon.",
    },
    youtube_community: {
      oneClick: false,
      envRequired: [],
      label: "YouTube Community",
      description: "Coming soon.",
    },
  };
  return configs[platform];
}

export function missingEnvVars(names: string[]): string[] {
  return names.filter((name) => !(process.env[name] || "").trim());
}
