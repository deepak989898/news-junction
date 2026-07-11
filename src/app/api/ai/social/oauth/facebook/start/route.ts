import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";
import { createOAuthState } from "@/lib/ai-social/oauth-state";
import { getFacebookOAuthUrl, missingEnvVars } from "@/lib/ai-social/oauth-providers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "Super admin required" }, { status: 403 });

  const missing = missingEnvVars(["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"]);
  if (missing.length) {
    return NextResponse.json(
      {
        error: `Missing environment variables: ${missing.join(", ")}. Add them in Vercel and redeploy.`,
        missing,
      },
      { status: 400 }
    );
  }

  try {
    const state = createOAuthState({ uid: admin.uid, platform: "facebook" });
    const url = getFacebookOAuthUrl(state);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Facebook OAuth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
