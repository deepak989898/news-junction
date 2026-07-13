import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { renderVideoPackage } from "@/lib/ai-voice-video/service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { packageId } = await request.json();
    if (!packageId) return NextResponse.json({ error: "packageId required" }, { status: 400 });
    const result = await renderVideoPackage(String(packageId), admin.uid);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reel render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
