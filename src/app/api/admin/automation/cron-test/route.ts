import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";
import { runAutoPublishCycle } from "@/lib/automation/fetch-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Super-admin only: test auto-publish using server CRON_SECRET (no manual copy needed). */
export async function POST(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on Vercel", configured: false },
      { status: 500 }
    );
  }

  try {
    const { force = true } = await request.json().catch(() => ({ force: true }));
    const result = await runAutoPublishCycle({ force: Boolean(force) });
    return NextResponse.json({ success: true, configured: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron test failed";
    return NextResponse.json({ error: message, configured: true }, { status: 500 });
  }
}
