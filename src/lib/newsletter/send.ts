import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";
import {
  NEWSLETTER_LOGS_COLLECTION,
  NEWSLETTER_SUBSCRIBERS_COLLECTION,
  getNewsletterConfig,
  isValidEmail,
  newUnsubscribeToken,
  normalizeEmail,
  subscriberDocId,
  type NewsletterSendResult,
  type NewsletterSubscriber,
} from "@/lib/newsletter/config";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app").replace(/\/$/, "");
}

export async function upsertSubscriber(opts: {
  email: string;
  language?: "hi" | "en";
  source?: string;
}): Promise<{ ok: true; id: string; created: boolean } | { ok: false; error: string }> {
  const email = normalizeEmail(opts.email);
  if (!isValidEmail(email)) return { ok: false, error: "Invalid email address." };

  const db = getAdminDb();
  const id = subscriberDocId(email);
  const ref = db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).doc(id);
  const existing = await ref.get();
  const now = new Date().toISOString();

  if (existing.exists) {
    const data = existing.data() || {};
    await ref.set(
      {
        email,
        status: "active",
        language: opts.language || data.language || "hi",
        source: opts.source || data.source || "website",
        unsubscribeToken: data.unsubscribeToken || newUnsubscribeToken(),
        updatedAt: now,
        resubscribedAt: data.status === "unsubscribed" ? now : data.resubscribedAt || null,
      },
      { merge: true }
    );
    return { ok: true, id, created: false };
  }

  await ref.set({
    email,
    status: "active",
    language: opts.language || "hi",
    source: opts.source || "website",
    unsubscribeToken: newUnsubscribeToken(),
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, id, created: true };
}

export async function unsubscribeByToken(
  token: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const clean = String(token || "").trim();
  if (!clean || clean.length < 16) return { ok: false, error: "Invalid unsubscribe link." };

  const db = getAdminDb();
  const snap = await db
    .collection(NEWSLETTER_SUBSCRIBERS_COLLECTION)
    .where("unsubscribeToken", "==", clean)
    .limit(1)
    .get();

  if (snap.empty) return { ok: false, error: "Subscription not found." };

  const doc = snap.docs[0];
  await doc.ref.set(
    {
      status: "unsubscribed",
      updatedAt: new Date().toISOString(),
      unsubscribedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return { ok: true, email: String(doc.data().email || "") };
}

export async function listActiveSubscribers(limit = 2000): Promise<NewsletterSubscriber[]> {
  const snap = await getAdminDb()
    .collection(NEWSLETTER_SUBSCRIBERS_COLLECTION)
    .where("status", "==", "active")
    .limit(limit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: String(data.email || ""),
      language: data.language === "en" ? "en" : "hi",
      status: "active",
      source: String(data.source || ""),
      unsubscribeToken: String(data.unsubscribeToken || ""),
      createdAt: String(data.createdAt || ""),
      updatedAt: String(data.updatedAt || ""),
    };
  });
}

export async function countSubscribers(): Promise<{ active: number; unsubscribed: number; total: number }> {
  const db = getAdminDb();
  try {
    const [active, unsubscribed] = await Promise.all([
      db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).where("status", "==", "active").count().get(),
      db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).where("status", "==", "unsubscribed").count().get(),
    ]);
    const a = active.data().count as number;
    const u = unsubscribed.data().count as number;
    return { active: a, unsubscribed: u, total: a + u };
  } catch {
    const snap = await db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).limit(2000).get();
    let active = 0;
    let unsubscribed = 0;
    snap.docs.forEach((d) => {
      if (d.data().status === "unsubscribed") unsubscribed += 1;
      else active += 1;
    });
    return { active, unsubscribed, total: active + unsubscribed };
  }
}

type DigestArticle = {
  id: string;
  title: string;
  summary: string;
  slug: string;
  url: string;
};

export async function getRecentDigestArticles(limit = 8): Promise<DigestArticle[]> {
  const snap = await getAdminDb()
    .collection("news")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  const base = siteUrl();
  return snap.docs.map((d) => {
    const data = d.data();
    const slug = String(data.slug || d.id);
    return {
      id: d.id,
      title: String(data.titleHi || data.titleEn || "News Junction"),
      summary: String(
        data.newsletterSnippet || data.summaryHi || data.summaryEn || ""
      ).slice(0, 220),
      slug,
      url: `${base}/article/${slug}`,
    };
  });
}

function buildDigestHtml(opts: {
  articles: DigestArticle[];
  language: "hi" | "en";
  unsubscribeUrl: string;
}): string {
  const hi = opts.language === "hi";
  const heading = hi ? "आज की मुख्य खबरें" : "Today's top stories";
  const intro = hi
    ? "News Junction से चुनी हुई ताज़ा खबरें।"
    : "Selected latest stories from News Junction.";
  const rows = opts.articles
    .map(
      (a) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <a href="${a.url}" style="color:#1a2b4c;font-size:18px;font-weight:700;text-decoration:none;">${escapeHtml(a.title)}</a>
          ${a.summary ? `<p style="margin:8px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">${escapeHtml(a.summary)}</p>` : ""}
          <p style="margin:10px 0 0;"><a href="${a.url}" style="color:#c41e20;font-size:13px;font-weight:600;">${hi ? "पूरा पढ़ें" : "Read more"} →</a></p>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#1a2b4c;padding:20px 24px;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;">NEWS <span style="color:#c41e20;">JUNCTION</span></div>
          <div style="margin-top:6px;color:#d1d5db;font-size:13px;">${escapeHtml(heading)}</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">${escapeHtml(intro)}</p>
          <table role="presentation" width="100%">${rows || `<tr><td style="color:#6b7280;">${hi ? "अभी कोई लेख उपलब्ध नहीं।" : "No articles available yet."}</td></tr>`}</table>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
          ${hi ? "आप यह ईमेल इसलिए पा रहे हैं क्योंकि आपने News Junction न्यूज़लेटर सब्सक्राइब किया है।" : "You are receiving this because you subscribed to the News Junction newsletter."}
          <br/><a href="${opts.unsubscribeUrl}" style="color:#c41e20;">${hi ? "अनसब्सक्राइब करें" : "Unsubscribe"}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const config = getNewsletterConfig();
  if (!config.configured) {
    return { ok: false, error: "RESEND_API_KEY and NEWSLETTER_FROM_EMAIL are required." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromHeader,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    let message = `Resend HTTP ${res.status}`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* ignore */
    }
    return { ok: false, error: message };
  }
  return { ok: true };
}

export async function sendNewsletterDigest(opts?: {
  subject?: string;
  language?: "hi" | "en";
  articleLimit?: number;
  testEmail?: string;
  type?: "digest" | "manual" | "test";
}): Promise<NewsletterSendResult> {
  const config = getNewsletterConfig();
  if (!config.configured) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      errors: ["RESEND_API_KEY and NEWSLETTER_FROM_EMAIL are required on the server."],
    };
  }

  const language = opts?.language || "hi";
  const articles = await getRecentDigestArticles(opts?.articleLimit ?? 8);
  const subject =
    opts?.subject ||
    (language === "hi"
      ? `News Junction — आज की ${articles.length} मुख्य खबरें`
      : `News Junction — ${articles.length} top stories`);

  let recipients: NewsletterSubscriber[];
  if (opts?.testEmail) {
    const email = normalizeEmail(opts.testEmail);
    if (!isValidEmail(email)) {
      return { attempted: 0, sent: 0, failed: 0, errors: ["Invalid test email."] };
    }
    recipients = [
      {
        id: "test",
        email,
        language,
        status: "active",
        source: "test",
        unsubscribeToken: "test",
        createdAt: "",
        updatedAt: "",
      },
    ];
  } else {
    recipients = await listActiveSubscribers();
  }

  if (!recipients.length) {
    const empty = {
      attempted: 0,
      sent: 0,
      failed: 0,
      errors: ["No active newsletter subscribers."],
    };
    await getAdminDb().collection(NEWSLETTER_LOGS_COLLECTION).add({
      type: opts?.type || "digest",
      subject,
      articleIds: articles.map((a) => a.id),
      ...empty,
      createdAt: new Date().toISOString(),
    });
    return empty;
  }

  const base = siteUrl();
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of recipients) {
    const unsubscribeUrl =
      sub.unsubscribeToken && sub.unsubscribeToken !== "test"
        ? `${base}/newsletter/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`
        : `${base}/contact-us`;
    const html = buildDigestHtml({
      articles,
      language: sub.language || language,
      unsubscribeUrl,
    });
    try {
      const result = await sendViaResend({ to: sub.email, subject, html });
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (errors.length < 10) errors.push(`${sub.email}: ${result.error}`);
      }
    } catch (err) {
      failed += 1;
      if (errors.length < 10) {
        errors.push(`${sub.email}: ${err instanceof Error ? err.message : "send failed"}`);
      }
    }
  }

  const logRef = await getAdminDb().collection(NEWSLETTER_LOGS_COLLECTION).add({
    type: opts?.type || (opts?.testEmail ? "test" : "digest"),
    subject,
    articleIds: articles.map((a) => a.id),
    attempted: recipients.length,
    sent,
    failed,
    errors,
    createdAt: new Date().toISOString(),
  });

  return {
    attempted: recipients.length,
    sent,
    failed,
    errors,
    logId: logRef.id,
  };
}
