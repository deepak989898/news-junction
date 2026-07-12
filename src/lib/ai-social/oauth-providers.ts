import { getSiteUrl } from "./oauth-state";
import { upsertSocialAccount } from "./service";
import { SocialPlatform } from "./types";

const FB_GRAPH = "https://graph.facebook.com/v25.0";
const FB_OAUTH_DIALOG = "https://www.facebook.com/v25.0/dialog/oauth";

/** Page publishing scopes per Meta Permissions Reference (pages_manage_posts dependencies). */
export const FACEBOOK_PAGE_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

function requireEnv(name: string): string {
  const value = (process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured in Vercel environment variables`);
  return value;
}

export function getFacebookRedirectUri(): string {
  return `${getSiteUrl()}/api/ai/social/oauth/facebook/callback`;
}

export function getFacebookOAuthUrl(state: string): string {
  const appId = requireEnv("FACEBOOK_APP_ID");
  const redirectUri = getFacebookRedirectUri();
  const configId = (process.env.FACEBOOK_LOGIN_CONFIG_ID || "").trim();
  const useScopes = (process.env.FACEBOOK_OAUTH_USE_SCOPES || "").trim() === "true";
  const systemUser = (process.env.FACEBOOK_OAUTH_SYSTEM_USER || "").trim() === "true";

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  });

  if (useScopes || !configId) {
    params.set("scope", FACEBOOK_PAGE_OAUTH_SCOPES.join(","));
  } else {
    if (configId === appId) {
      throw new Error(
        "FACEBOOK_LOGIN_CONFIG_ID must be the Configuration ID from Facebook Login for Business → Configurations, not the App ID."
      );
    }
    params.set("config_id", configId);
    // override_default_response_type is only for System User token configurations (Meta docs).
    if (systemUser) {
      params.set("override_default_response_type", "true");
    }
  }

  return `${FB_OAUTH_DIALOG}?${params.toString()}`;
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
  const redirectUri = getFacebookRedirectUri();
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
      tasks?: string[];
    }>;
  }>("/me/accounts", {
    access_token: longToken.access_token,
    fields: "id,name,access_token,tasks",
  });

  if (!accounts.data?.length) {
    throw new Error("No Facebook Pages found. Create a Page and grant Page access during authorization.");
  }

  const page =
    (configuredPageId && accounts.data.find((p) => p.id === configuredPageId)) ||
    accounts.data[0];

  if (configuredPageId && page.id !== configuredPageId) {
    throw new Error(
      `FACEBOOK_PAGE_ID (${configuredPageId}) was not returned for this Facebook account. Use the Page admin account that manages that Page.`
    );
  }

  const canPublish =
    !page.tasks?.length ||
    page.tasks.some((task) => ["CREATE_CONTENT", "MANAGE"].includes(task));
  if (!canPublish) {
    throw new Error(
      `Facebook account lacks CREATE_CONTENT permission on Page "${page.name}". Use a Page admin account.`
    );
  }

  await upsertSocialAccount({
    platform: "facebook",
    accountName: page.name,
    accountId: page.id,
    token: page.access_token,
    scopes: [...FACEBOOK_PAGE_OAUTH_SCOPES],
    enabled: true,
  });

  return { pageName: page.name, pageId: page.id };
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
      envRequired: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_LOGIN_CONFIG_ID"],
      label: "Facebook Page",
      description:
        "Authorize your Facebook Page via Facebook Login for Business. Requires Meta app with Pages use case + Configuration ID.",
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
      description: "Instagram publishing requires separate Instagram Graph permissions and App Review.",
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
