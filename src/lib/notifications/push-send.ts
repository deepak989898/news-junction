import { getAdminDb } from "@/lib/firebase-admin";

export type PushPayload = {
  title: string;
  body: string;
  articleId?: string;
  slug?: string;
  url?: string;
  type?: "breaking" | "new_article" | "digest" | "manual";
};

export type PushSendResult = {
  attempted: number;
  sent: number;
  failed: number;
  tickets: unknown[];
  errors: string[];
};

type TokenDoc = {
  uid?: string;
  token?: string;
  tokens?: string[];
  platform?: string;
};

function normalizeTokens(docs: TokenDoc[]): { uid: string; token: string }[] {
  const out: { uid: string; token: string }[] = [];
  const seen = new Set<string>();
  for (const d of docs) {
    const uid = String(d.uid || "");
    const list = [
      ...(d.token ? [d.token] : []),
      ...(Array.isArray(d.tokens) ? d.tokens : []),
    ]
      .map((t) => String(t || "").trim())
      .filter(Boolean);
    for (const token of list) {
      if (seen.has(token)) continue;
      seen.add(token);
      out.push({ uid, token });
    }
  }
  return out;
}

function isExpoToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoPush(
  messages: {
    to: string;
    title: string;
    body: string;
    data: Record<string, string>;
    sound: string;
    priority: string;
  }[]
): Promise<{ tickets: unknown[]; errors: string[] }> {
  if (!messages.length) return { tickets: [], errors: [] };

  const tickets: unknown[] = [];
  const errors: string[] = [];

  // Expo accepts max ~100 messages per request
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN
            ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json()) as { data?: unknown; errors?: { message?: string }[] };
      if (!res.ok) {
        errors.push(json.errors?.[0]?.message || `Expo push HTTP ${res.status}`);
        continue;
      }
      if (Array.isArray(json.data)) tickets.push(...json.data);
      else if (json.data) tickets.push(json.data);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Expo push failed");
    }
  }

  return { tickets, errors };
}

export async function getRegisteredPushTokens() {
  const snap = await getAdminDb().collection("userPushTokens").limit(2000).get();
  return normalizeTokens(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as TokenDoc) })));
}

export async function sendPushNotification(payload: PushPayload): Promise<PushSendResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app";
  const url =
    payload.url ||
    (payload.slug ? `${siteUrl}/article/${payload.slug}` : siteUrl);

  const tokens = await getRegisteredPushTokens();
  const expoTokens = tokens.filter((t) => isExpoToken(t.token));
  const otherTokens = tokens.filter((t) => !isExpoToken(t.token));

  const errors: string[] = [];
  if (otherTokens.length) {
    errors.push(
      `${otherTokens.length} non-Expo token(s) skipped (web/FCM delivery needs VAPID wiring)`
    );
  }

  const messages = expoTokens.map(({ token }) => ({
    to: token,
    title: payload.title.slice(0, 100),
    body: payload.body.slice(0, 180),
    sound: "default",
    priority: "high",
    data: {
      type: payload.type || "new_article",
      articleId: payload.articleId || "",
      slug: payload.slug || "",
      url,
    },
  }));

  const { tickets, errors: sendErrors } = await sendExpoPush(messages);
  errors.push(...sendErrors);

  const ticketFails = tickets.filter(
    (t) => t && typeof t === "object" && "status" in t && (t as { status: string }).status === "error"
  ).length;
  const sent = Math.max(0, messages.length - ticketFails - sendErrors.length);
  const failed = Math.max(0, messages.length - sent) + otherTokens.length;

  const log = {
    ...payload,
    url,
    attempted: tokens.length,
    sent,
    failed,
    expoAttempted: messages.length,
    errors: errors.slice(0, 10),
    createdAt: new Date().toISOString(),
  };
  await getAdminDb().collection("pushLogs").add(log);
  await getAdminDb().collection("notifications").add({
    title: payload.title,
    body: payload.body,
    type: payload.type || "new_article",
    articleId: payload.articleId || null,
    slug: payload.slug || null,
    url,
    delivery: { attempted: tokens.length, sent, failed },
    status: sent > 0 ? "sent" : tokens.length === 0 ? "no_tokens" : "failed",
    createdAt: new Date().toISOString(),
  });

  return {
    attempted: tokens.length,
    sent,
    failed,
    tickets,
    errors,
  };
}

export async function sendNewArticlePush(article: {
  id: string;
  titleHi?: string;
  titleEn?: string;
  summaryHi?: string;
  summaryEn?: string;
  slug?: string;
  pushText?: string;
  isBreaking?: boolean;
}): Promise<PushSendResult> {
  const title =
    (article.isBreaking ? "🔴 Breaking: " : "") +
    String(article.titleHi || article.titleEn || "News Junction").slice(0, 80);
  const body = String(
    article.pushText || article.summaryHi || article.summaryEn || article.titleEn || "New article published"
  ).slice(0, 160);

  return sendPushNotification({
    title,
    body,
    articleId: article.id,
    slug: article.slug,
    type: article.isBreaking ? "breaking" : "new_article",
  });
}
