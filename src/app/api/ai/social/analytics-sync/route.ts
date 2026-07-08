import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { logSocial } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    await logSocial({
      actionType: "analytics_sync",
      status: "success",
      message: "Analytics sync triggered (platform pull adapters can be added per platform).",
      createdBy: admin.uid,
    });
    return NextResponse.json({ success: true, synced: false, message: "Scaffold ready. Add per-platform pull APIs." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
