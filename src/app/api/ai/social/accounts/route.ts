import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { disconnectSocialAccount, getSocialAccounts, upsertSocialAccount } from "@/lib/ai-social/service";
import { SocialPlatform } from "@/lib/ai-social/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const accounts = await getSocialAccounts();
    const safeAccounts = accounts.map((a) => ({ ...a, tokenEncrypted: "***", refreshTokenEncrypted: a.refreshTokenEncrypted ? "***" : undefined }));
    return NextResponse.json({ accounts: safeAccounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load social accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const required = ["platform", "accountName", "token"];
    for (const key of required) {
      if (!body[key]) return NextResponse.json({ error: `${key} required` }, { status: 400 });
    }
    const account = await upsertSocialAccount({
      platform: body.platform as SocialPlatform,
      accountName: body.accountName,
      accountId: body.accountId,
      token: body.token,
      refreshToken: body.refreshToken,
      tokenExpiresAt: body.tokenExpiresAt,
      scopes: body.scopes,
      enabled: body.enabled,
    });
    return NextResponse.json({ account: { ...account, tokenEncrypted: "***", refreshTokenEncrypted: account.refreshTokenEncrypted ? "***" : undefined } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect social account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { platform, action } = await request.json();
    if (action === "disconnect") {
      await disconnectSocialAccount(platform as SocialPlatform);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
