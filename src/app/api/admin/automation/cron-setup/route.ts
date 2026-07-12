import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";
import { isCronSecretConfigured } from "@/lib/automation/cron-auth";

export const runtime = "nodejs";

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const secret = (process.env.CRON_SECRET || "").trim();
  const configured = isCronSecretConfigured();
  const base = siteBaseUrl();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      message: "CRON_SECRET is not set on Vercel. Add it in Environment Variables and redeploy.",
      urls: null,
    });
  }

  const encoded = encodeURIComponent(secret);
  return NextResponse.json({
    configured: true,
    secretPreview: `${secret.slice(0, 4)}...${secret.slice(-4)}`,
    secretLength: secret.length,
    urls: {
      autoPublishCycle: `${base}/api/cron/auto-publish-cycle?cron_secret=${encoded}`,
      autoPublishCycleForce: `${base}/api/cron/auto-publish-cycle?cron_secret=${encoded}&force=true`,
      processSocialQueue: `${base}/api/cron/process-social-queue?cron_secret=${encoded}`,
    },
    cronJobOrgSteps: [
      "Create cron job → URL: paste autoPublishCycle URL above (includes secret)",
      "Method: GET",
      "Leave Headers empty",
      "Schedule: Every 30 minutes",
      "Save → Test Run should return 200",
    ],
  });
}
