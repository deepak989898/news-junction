import { createHash, randomBytes } from "crypto";

export const NEWSLETTER_SUBSCRIBERS_COLLECTION = "newsletterSubscribers";
export const NEWSLETTER_LOGS_COLLECTION = "newsletterLogs";

export type NewsletterSubscriberStatus = "active" | "unsubscribed";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  language: "hi" | "en";
  status: NewsletterSubscriberStatus;
  source: string;
  unsubscribeToken: string;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterSendResult = {
  attempted: number;
  sent: number;
  failed: number;
  errors: string[];
  logId?: string;
};

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function subscriberDocId(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 40);
}

export function newUnsubscribeToken(): string {
  return randomBytes(24).toString("hex");
}

export function getNewsletterConfig() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.NEWSLETTER_FROM_EMAIL || "").trim();
  const fromName = String(process.env.NEWSLETTER_FROM_NAME || "News Junction").trim();
  const replyTo = String(process.env.NEWSLETTER_REPLY_TO || "").trim();
  return {
    configured: Boolean(apiKey && fromEmail),
    apiKey,
    fromEmail,
    fromName,
    replyTo,
    fromHeader: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
  };
}
