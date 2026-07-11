import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";
import { connectTelegramBot, missingEnvVars } from "@/lib/ai-social/oauth-providers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Super admin required" }, { status: 403 });

  const missing = missingEnvVars(["TELEGRAM_CHANNEL_ID", "SOCIAL_TOKEN_ENCRYPTION_KEY"]);
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing environment variables: ${missing.join(", ")}`, missing },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const botToken = String(body.botToken || "").trim();
    if (!botToken) return NextResponse.json({ error: "botToken required" }, { status: 400 });

    const result = await connectTelegramBot(botToken);
    return NextResponse.json({
      success: true,
      accountName: result.accountName,
      channelTitle: result.channelTitle,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram connect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
