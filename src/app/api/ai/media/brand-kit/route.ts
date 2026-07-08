import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getMediaBrandKit, updateMediaBrandKit } from "@/lib/ai-media/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const brandKit = await getMediaBrandKit();
    return NextResponse.json(brandKit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load brand kit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const brandKit = await updateMediaBrandKit(body);
    return NextResponse.json(brandKit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update brand kit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
