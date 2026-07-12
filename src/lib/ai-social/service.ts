import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { getArticleById, getAISettings } from "@/lib/ai-studio/server-db";
import { callAI } from "@/lib/ai-studio/ai-client";
import { DEFAULT_SOCIAL_SETTINGS, DEFAULT_SOCIAL_TEMPLATES, SOCIAL_MANAGER_SETTINGS_DOC_ID, SOCIAL_SYSTEM_PROMPT } from "./defaults";
import {
  GeneratedSocialContent,
  SocialAccount,
  SocialAnalytics,
  SocialCampaign,
  SocialLog,
  SocialManagerSettings,
  SocialPlatform,
  SocialPostQueueItem,
  SocialQueueStatus,
  SocialTemplate,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function requiredKey(): Buffer {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || "";
  if (!key) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY not configured");
  return crypto.createHash("sha256").update(key).digest();
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = requiredKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = requiredKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function articleLanguageText(article: NewsDoc, lang: "hi" | "en") {
  if (lang === "hi") {
    return {
      title: String(article.titleHi || article.titleEn || ""),
      summary: String(article.summaryHi || article.summaryEn || ""),
    };
  }
  return {
    title: String(article.titleEn || article.titleHi || ""),
    summary: String(article.summaryEn || article.summaryHi || ""),
  };
}

export async function getSocialSettings(): Promise<SocialManagerSettings> {
  const doc = await getAdminDb().collection("settings").doc(SOCIAL_MANAGER_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_SOCIAL_SETTINGS };
  return { ...DEFAULT_SOCIAL_SETTINGS, ...(doc.data() as SocialManagerSettings) };
}

export async function updateSocialSettings(patch: Partial<SocialManagerSettings>) {
  await getAdminDb()
    .collection("settings")
    .doc(SOCIAL_MANAGER_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_SOCIAL_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  return getSocialSettings();
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

export async function upsertSocialAccount(input: {
  platform: SocialPlatform;
  accountName: string;
  accountId?: string;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
  enabled?: boolean;
}) {
  const existing = await getAdminDb()
    .collection("socialAccounts")
    .where("platform", "==", input.platform)
    .limit(1)
    .get();
  const payload = stripUndefined({
    platform: input.platform,
    accountName: input.accountName,
    accountId: input.accountId,
    tokenEncrypted: encrypt(input.token),
    refreshTokenEncrypted: input.refreshToken ? encrypt(input.refreshToken) : undefined,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes || [],
    enabled: input.enabled ?? true,
    status: "connected" as const,
    lastCheckedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (existing.empty) {
    const ref = await getAdminDb().collection("socialAccounts").add(payload);
    return { id: ref.id, ...payload };
  }
  const ref = existing.docs[0].ref;
  await ref.update(stripUndefined({ ...payload, createdAt: existing.docs[0].data().createdAt || nowIso() }));
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as SocialAccount;
}

export async function disconnectSocialAccount(platform: SocialPlatform) {
  const snap = await getAdminDb()
    .collection("socialAccounts")
    .where("platform", "==", platform)
    .limit(1)
    .get();
  if (snap.empty) return;
  await snap.docs[0].ref.update({ enabled: false, status: "disconnected", updatedAt: nowIso() });
}

export async function getSocialAccounts(): Promise<SocialAccount[]> {
  const snap = await getAdminDb().collection("socialAccounts").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SocialAccount, "id">) }));
}

export async function getTemplates(): Promise<SocialTemplate[]> {
  const snap = await getAdminDb().collection("socialTemplates").where("isActive", "==", true).get();
  if (snap.empty) {
    const batch = getAdminDb().batch();
    DEFAULT_SOCIAL_TEMPLATES.forEach((tpl) => {
      const ref = getAdminDb().collection("socialTemplates").doc();
      batch.set(ref, { ...tpl, createdAt: nowIso(), updatedAt: nowIso() });
    });
    await batch.commit();
    return getTemplates();
  }
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SocialTemplate, "id">) }));
}

export async function upsertTemplate(input: Partial<SocialTemplate> & { id?: string }) {
  if (input.id) {
    await getAdminDb()
      .collection("socialTemplates")
      .doc(input.id)
      .set({ ...input, updatedAt: nowIso() }, { merge: true });
    return;
  }
  await getAdminDb().collection("socialTemplates").add({
    name: input.name || "Template",
    type: input.type || "general",
    prompt: input.prompt || "",
    isActive: input.isActive ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

async function selectTemplate(article: NewsDoc, isBreaking?: boolean): Promise<SocialTemplate> {
  const templates = await getTemplates();
  if (isBreaking || article.isBreaking) {
    const t = templates.find((x) => x.type === "breaking_news");
    if (t) return t;
  }
  const category = String(article.categoryNameEn || "").toLowerCase();
  const byCategory =
    (category.includes("sport") && templates.find((x) => x.type === "sports")) ||
    (category.includes("tech") && templates.find((x) => x.type === "technology")) ||
    (category.includes("business") && templates.find((x) => x.type === "business")) ||
    (category.includes("entertain") && templates.find((x) => x.type === "entertainment")) ||
    (category.includes("health") && templates.find((x) => x.type === "health")) ||
    (category.includes("politic") && templates.find((x) => x.type === "politics"));
  return byCategory || templates.find((x) => x.type === "general") || templates[0];
}

export async function generateSocialContent(articleId: string, options?: { breaking?: boolean }) {
  const articleRaw = await getArticleById(articleId);
  if (!articleRaw) throw new Error("Article not found");
  const article = articleRaw as NewsDoc;
  const template = await selectTemplate(article, options?.breaking);
  const aiSettings = await getAISettings();
  const prompt = `${template.prompt}
Return JSON with keys: facebookPost, instagramCaption, xPost, linkedinPost, telegramPost, shortPromo, longVersion, breakingVersion, hindiVersion, englishVersion, hashtags (array), callToAction.
Article title HI: ${String(article.titleHi || "")}
Article title EN: ${String(article.titleEn || "")}
Summary HI: ${String(article.summaryHi || "")}
Summary EN: ${String(article.summaryEn || "")}
Category: ${String(article.categoryNameEn || article.categoryNameHi || "")}
Use featured image context if available: ${String(article.imageUrl || "")}
`;
  const { text, tokensUsed } = await callAI(aiSettings, SOCIAL_SYSTEM_PROMPT, prompt);
  const json = text.match(/\{[\s\S]*\}/)?.[0] || "{}";
  let content: GeneratedSocialContent;
  try {
    content = JSON.parse(json) as GeneratedSocialContent;
  } catch {
    content = {
      facebookPost: String(article.titleEn || article.titleHi || ""),
      instagramCaption: String(article.summaryEn || article.summaryHi || ""),
      xPost: String(article.titleEn || article.titleHi || "").slice(0, 250),
      linkedinPost: String(article.summaryEn || article.summaryHi || ""),
      telegramPost: String(article.summaryEn || article.summaryHi || ""),
      shortPromo: String(article.titleEn || article.titleHi || ""),
      longVersion: String(article.summaryEn || article.summaryHi || ""),
      breakingVersion: String(article.titleEn || article.titleHi || ""),
      hindiVersion: String(article.summaryHi || article.summaryEn || ""),
      englishVersion: String(article.summaryEn || article.summaryHi || ""),
      hashtags: (article.tags as string[]) || [],
      callToAction: "Read full story on News Junction.",
    };
  }
  await logSocial({
    articleId,
    actionType: "generate_social_content",
    status: "success",
    message: "AI content generated",
    metadata: { tokensUsed, provider: aiSettings.provider },
  });
  return { content, tokensUsed, provider: aiSettings.provider };
}

export async function createCampaign(input: Omit<SocialCampaign, "id" | "postsGenerated" | "postsPublished" | "createdAt" | "updatedAt"> & { createdBy: string }) {
  const payload: Omit<SocialCampaign, "id"> = {
    ...input,
    postsGenerated: 0,
    postsPublished: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("socialCampaigns").add(payload);
  return { id: ref.id, ...payload };
}

export async function schedulePost(input: Omit<SocialPostQueueItem, "id" | "createdAt" | "updatedAt" | "retryCount" | "status"> & { status?: SocialQueueStatus }) {
  const settings = await getSocialSettings();
  const articleRaw = await getArticleById(input.articleId);
  if (!articleRaw) throw new Error("Article not found");
  const article = articleRaw as NewsDoc;
  if (settings.publishOnlyIfFeaturedImageExists && !article.imageUrl) {
    throw new Error("Featured image required before scheduling social post");
  }
  const status: SocialQueueStatus = input.scheduledAt ? "scheduled" : "pending";
  const payload: Omit<SocialPostQueueItem, "id"> = {
    ...input,
    status,
    retryCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await getAdminDb().collection("socialPostQueue").add(payload);
  await logSocial({
    articleId: input.articleId,
    queueId: ref.id,
    platform: input.platform,
    actionType: "schedule_post",
    status: "success",
    message: `Post ${status}`,
    createdBy: input.createdBy,
  });
  return { id: ref.id, ...payload };
}

function isWithinBusinessHours(settings: SocialManagerSettings) {
  const hour = new Date().getHours();
  return hour >= settings.businessHoursStart && hour <= settings.businessHoursEnd;
}

function backoffMs(retryCount: number) {
  return Math.min(5 * 60 * 1000, 2000 * 2 ** retryCount);
}

async function publishToPlatform(
  platform: SocialPlatform,
  text: string,
  imageUrl: string | undefined,
  token: string,
  accountId?: string
) {
  if (platform === "telegram") {
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!chatId) throw new Error("TELEGRAM_CHANNEL_ID not configured");
    const url = imageUrl
      ? `https://api.telegram.org/bot${token}/sendPhoto`
      : `https://api.telegram.org/bot${token}/sendMessage`;
    const body = imageUrl
      ? { chat_id: chatId, photo: imageUrl, caption: text }
      : { chat_id: chatId, text };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Telegram publish failed: ${res.status}`);
    return { platformPostId: `telegram-${Date.now()}` };
  }
  if (platform === "facebook") {
    const pageId = accountId || process.env.FACEBOOK_PAGE_ID;
    if (!pageId) throw new Error("Facebook Page ID not configured. Reconnect the Page in Social Accounts.");
    const endpoint = imageUrl
      ? `https://graph.facebook.com/v20.0/${pageId}/photos`
      : `https://graph.facebook.com/v20.0/${pageId}/feed`;
    const body = imageUrl
      ? new URLSearchParams({ url: imageUrl, caption: text, access_token: token })
      : new URLSearchParams({ message: text, access_token: token });
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Facebook publish failed: ${res.status}`);
    return { platformPostId: `facebook-${Date.now()}` };
  }
  if (platform === "linkedin") {
    throw new Error("LinkedIn publishing requires app-specific OAuth scope setup. Configure via social accounts.");
  }
  if (platform === "x") {
    throw new Error("X publishing requires OAuth 1.0a/2 user-context setup. Configure via social accounts.");
  }
  if (platform === "instagram") {
    throw new Error("Instagram publishing requires business account + graph API setup.");
  }
  if (platform === "whatsapp_channel" || platform === "youtube_community") {
    throw new Error(`${platform} is future-ready placeholder`);
  }
  throw new Error(`Unsupported platform ${platform}`);
}

export async function processSocialQueue(limit = 20) {
  const settings = await getSocialSettings();
  const now = nowIso();
  const snap = await getAdminDb()
    .collection("socialPostQueue")
    .where("status", "in", ["pending", "scheduled"])
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  let published = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const item = doc.data() as SocialPostQueueItem;
    if (item.status === "scheduled" && item.scheduledAt && item.scheduledAt > now) continue;
    if (!settings.autoPublishEnabled && item.approvalStatus !== "approved") continue;
    if (!isWithinBusinessHours(settings)) continue;
    await doc.ref.update({ status: "processing", updatedAt: nowIso() });
    try {
      const accountSnap = await getAdminDb()
        .collection("socialAccounts")
        .where("platform", "==", item.platform)
        .where("enabled", "==", true)
        .limit(1)
        .get();
      if (accountSnap.empty) throw new Error(`No connected account for ${item.platform}`);
      const account = accountSnap.docs[0].data() as SocialAccount;
      const token = decrypt(account.tokenEncrypted);
      await publishToPlatform(
        item.platform,
        `${item.text}\n\n${item.hashtags.join(" ")}\n${item.cta}`.trim(),
        item.imageUrl,
        token,
        account.accountId
      );
      await doc.ref.update({ status: "published", publishedAt: nowIso(), updatedAt: nowIso() });
      published += 1;
      await syncAnalyticsOnPublish(item);
      await logSocial({
        articleId: item.articleId,
        queueId: doc.id,
        platform: item.platform,
        actionType: "publish_post",
        status: "success",
        message: "Post published",
      });
    } catch (error) {
      const retryCount = (item.retryCount || 0) + 1;
      const canRetry = retryCount <= settings.maxRetries;
      const status: SocialQueueStatus = canRetry ? "pending" : "failed";
      const errorMessage = error instanceof Error ? error.message : "Publish failed";
      await doc.ref.update({
        status,
        retryCount,
        errorMessage,
        scheduledAt: canRetry ? new Date(Date.now() + backoffMs(retryCount)).toISOString() : item.scheduledAt,
        updatedAt: nowIso(),
      });
      failed += 1;
      await logSocial({
        articleId: item.articleId,
        queueId: doc.id,
        platform: item.platform,
        actionType: "publish_post",
        status: "failed",
        message: errorMessage,
      });
    }
  }
  return { checked: snap.size, published, failed };
}

export async function bulkAction(input: {
  queueIds: string[];
  action: "publish" | "cancel" | "regenerate_captions" | "regenerate_hashtags";
  usedBy: string;
}) {
  const refs = input.queueIds.slice(0, 200).map((id) => getAdminDb().collection("socialPostQueue").doc(id));
  if (input.action === "cancel") {
    await Promise.all(refs.map((r) => r.update({ status: "cancelled", updatedAt: nowIso() })));
    return { updated: refs.length };
  }
  if (input.action === "publish") {
    await Promise.all(refs.map((r) => r.update({ approvalStatus: "approved", status: "pending", updatedAt: nowIso() })));
    return { updated: refs.length };
  }
  for (const ref of refs) {
    const doc = await ref.get();
    if (!doc.exists) continue;
    const item = doc.data() as SocialPostQueueItem;
    const generated = await generateSocialContent(item.articleId);
    if (input.action === "regenerate_captions") {
      const map: Record<SocialPlatform, string> = {
        facebook: generated.content.facebookPost,
        instagram: generated.content.instagramCaption,
        x: generated.content.xPost,
        linkedin: generated.content.linkedinPost,
        telegram: generated.content.telegramPost,
        whatsapp_channel: generated.content.shortPromo,
        youtube_community: generated.content.longVersion,
      };
      await ref.update({ text: map[item.platform], updatedAt: nowIso() });
    } else {
      await ref.update({ hashtags: generated.content.hashtags, updatedAt: nowIso() });
    }
  }
  return { updated: refs.length };
}

export async function logSocial(entry: Omit<SocialLog, "id" | "createdAt">) {
  await getAdminDb().collection("socialLogs").add({ ...entry, createdAt: nowIso() });
}

async function syncAnalyticsOnPublish(item: SocialPostQueueItem) {
  const dateBucket = new Date().toISOString().slice(0, 10);
  const key = `${item.platform}_${dateBucket}_${item.articleId}`;
  const ref = getAdminDb().collection("socialAnalytics").doc(key);
  const doc = await ref.get();
  if (!doc.exists) {
    const payload: SocialAnalytics = {
      platform: item.platform,
      articleId: item.articleId,
      categoryId: undefined,
      impressions: 0,
      clicks: 0,
      engagement: 0,
      publishedCount: 1,
      failedCount: 0,
      dateBucket,
      updatedAt: nowIso(),
    };
    await ref.set(payload);
    return;
  }
  const data = doc.data() as SocialAnalytics;
  await ref.update({
    publishedCount: (data.publishedCount || 0) + 1,
    updatedAt: nowIso(),
  });
}

export async function getSocialManagerDashboard() {
  const [accounts, queue, campaigns, analytics, logs, settings] = await Promise.all([
    getSocialAccounts(),
    getAdminDb().collection("socialPostQueue").orderBy("createdAt", "desc").limit(300).get(),
    getAdminDb().collection("socialCampaigns").orderBy("createdAt", "desc").limit(80).get(),
    getAdminDb().collection("socialAnalytics").orderBy("updatedAt", "desc").limit(200).get(),
    getAdminDb().collection("socialLogs").orderBy("createdAt", "desc").limit(200).get(),
    getSocialSettings(),
  ]);

  const queueItems: Record<string, unknown>[] = queue.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const pending = queueItems.filter((q) => q["status"] === "pending" || q["status"] === "scheduled").length;
  const published = queueItems.filter((q) => q["status"] === "published").length;
  const failed = queueItems.filter((q) => q["status"] === "failed").length;
  const platformWins = new Map<string, number>();
  analytics.docs.forEach((d) => {
    const data = d.data();
    const platform = String(data.platform || "");
    const score = Number(data.engagement || 0) + Number(data.clicks || 0);
    platformWins.set(platform, (platformWins.get(platform) || 0) + score);
  });
  const topPlatform = [...platformWins.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "n/a";
  const categoryMap = new Map<string, number>();
  analytics.docs.forEach((d) => {
    const category = String(d.data().categoryId || "uncategorized");
    const score = Number(d.data().engagement || 0) + Number(d.data().clicks || 0);
    categoryMap.set(category, (categoryMap.get(category) || 0) + score);
  });
  const topCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "n/a";

  return {
    settings,
    accounts,
    queue: queueItems,
    campaigns: campaigns.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    analytics: analytics.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    logs: logs.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    stats: {
      publishedPosts: published,
      scheduledPosts: pending,
      failedPosts: failed,
      topPerformingPlatform: topPlatform,
      topPerformingCategory: topCategory,
      queueBacklog: pending,
      connectedAccounts: accounts.filter((a) => a.enabled && a.status === "connected").length,
    },
  };
}
