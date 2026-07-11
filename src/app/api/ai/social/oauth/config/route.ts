import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getPlatformConnectConfig, missingEnvVars } from "@/lib/ai-social/oauth-providers";
import { SocialPlatform } from "@/lib/ai-social/types";

export const runtime = "nodejs";

const PLATFORMS: SocialPlatform[] = [
  "facebook",
  "telegram",
  "instagram",
  "x",
  "linkedin",
  "whatsapp_channel",
  "youtube_community",
];

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platforms = PLATFORMS.map((platform) => {
    const config = getPlatformConnectConfig(platform);
    const missing = missingEnvVars(config.envRequired);
    return {
      platform,
      ...config,
      ready: config.oneClick && missing.length === 0,
      missing,
    };
  });

  return NextResponse.json({ platforms });
}
