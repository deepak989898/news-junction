import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { sendPushNotification } from "@/lib/notifications/push-send";

export const runtime = "nodejs";
export const maxDuration = 30;

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
