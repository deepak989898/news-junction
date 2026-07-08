import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getSocialManagerDashboard } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getSocialManagerDashboard();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load social dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
