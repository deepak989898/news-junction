import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getSocialSettings, updateSocialSettings } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const settings = await getSocialSettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load social settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const settings = await updateSocialSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update social settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
