import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";
import { getFacebookRedirectUri, missingEnvVars } from "@/lib/ai-social/oauth-providers";
import { getSiteUrl } from "@/lib/ai-social/oauth-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Super admin required" }, { status: 403 });

  const appId = (process.env.FACEBOOK_APP_ID || "").trim();
  const configId = (process.env.FACEBOOK_LOGIN_CONFIG_ID || "").trim();
  const siteUrl = getSiteUrl();
  const redirectUri = getFacebookRedirectUri();

  return NextResponse.json({
    siteUrl,
    redirectUri,
    appId: appId || null,
    hasAppSecret: Boolean((process.env.FACEBOOK_APP_SECRET || "").trim()),
    hasConfigId: Boolean(configId),
    configIdLooksLikeAppId: Boolean(configId && appId && configId === appId),
    configIdPreview: configId ? `${configId.slice(0, 4)}...${configId.slice(-4)}` : null,
    missingEnv: missingEnvVars(["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_LOGIN_CONFIG_ID"]),
    metaDashboardSteps: [
      "Facebook Login for Business → Settings → Valid OAuth Redirect URIs must match redirectUri exactly",
      "Configurations → User access token → Pages → pages_manage_posts permissions",
      "Copy Configuration ID to Vercel FACEBOOK_LOGIN_CONFIG_ID (not App ID)",
      "App roles → your Facebook account must be Administrator or Developer",
    ],
  });
}
