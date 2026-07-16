import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  NEWSLETTER_LOGS_COLLECTION,
  NEWSLETTER_SUBSCRIBERS_COLLECTION,
  getNewsletterConfig,
} from "@/lib/newsletter/config";
import { countSubscribers, sendNewsletterDigest } from "@/lib/newsletter/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = getNewsletterConfig();
  const counts = await countSubscribers();
  const db = getAdminDb();

  const [subsSnap, logsSnap] = await Promise.all([
    db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).limit(50).get(),
    db.collection(NEWSLETTER_LOGS_COLLECTION).limit(20).get(),
  ]);

  const subscribers = subsSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: String(data.email || ""),
        status: String(data.status || "active"),
        language: String(data.language || "hi"),
        source: String(data.source || ""),
        createdAt: String(data.createdAt || ""),
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const logs = logsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      String((b as { createdAt?: string }).createdAt || "").localeCompare(
        String((a as { createdAt?: string }).createdAt || "")
      )
    );

  return NextResponse.json({
    config: {
      configured: config.configured,
      fromEmail: config.fromEmail ? `${config.fromEmail.slice(0, 2)}…` : "",
      fromName: config.fromName,
      hasApiKey: Boolean(config.apiKey),
    },
    counts,
    subscribers,
    logs,
  });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action || "send").trim();

    if (action === "test") {
      const testEmail = String(body.testEmail || "").trim();
      if (!testEmail) {
        return NextResponse.json({ error: "testEmail required" }, { status: 400 });
      }
      const result = await sendNewsletterDigest({
        testEmail,
        subject: String(body.subject || "").trim() || undefined,
        language: body.language === "en" ? "en" : "hi",
        type: "test",
      });
      return NextResponse.json({ success: true, result });
    }

    const result = await sendNewsletterDigest({
      subject: String(body.subject || "").trim() || undefined,
      language: body.language === "en" ? "en" : "hi",
      articleLimit: Math.min(12, Math.max(3, Number(body.articleLimit) || 8)),
      type: "manual",
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Newsletter send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
