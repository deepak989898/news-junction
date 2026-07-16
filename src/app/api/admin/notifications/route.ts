import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getRegisteredPushTokens, sendPushNotification } from "@/lib/notifications/push-send";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminDb();
  const [tokens, logsSnap] = await Promise.all([
    getRegisteredPushTokens(),
    db.collection("pushLogs").limit(30).get(),
  ]);

  const logs = logsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      String((b as { createdAt?: string }).createdAt || "").localeCompare(
        String((a as { createdAt?: string }).createdAt || "")
      )
    )
    .slice(0, 20);

  return NextResponse.json({
    tokenCount: tokens.length,
    expoTokenCount: tokens.filter(
      (t) => t.token.startsWith("ExponentPushToken[") || t.token.startsWith("ExpoPushToken[")
    ).length,
    hasExpoAccessToken: Boolean(process.env.EXPO_ACCESS_TOKEN),
    logs,
  });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const messageBody = String(body.body || body.message || "").trim();
    if (!title || !messageBody) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 });
    }

    const result = await sendPushNotification({
      title,
      body: messageBody,
      articleId: body.articleId ? String(body.articleId) : undefined,
      slug: body.slug ? String(body.slug) : undefined,
      url: body.url ? String(body.url) : undefined,
      type: (body.type as "breaking" | "new_article" | "digest" | "manual") || "manual",
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
