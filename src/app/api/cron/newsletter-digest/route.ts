import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/automation/cron-auth";
import { getNewsletterConfig } from "@/lib/newsletter/config";
import { sendNewsletterDigest } from "@/lib/newsletter/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getNewsletterConfig();
  if (!config.configured) {
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: "RESEND_API_KEY / NEWSLETTER_FROM_EMAIL not configured",
    });
  }

  try {
    const result = await sendNewsletterDigest({ type: "digest", language: "hi", articleLimit: 8 });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Newsletter digest failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
