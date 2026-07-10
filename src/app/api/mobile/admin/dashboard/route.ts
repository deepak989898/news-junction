import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAdmin } from "../_utils";
import { getMobileAdminDashboard } from "@/lib/mobile-admin/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const data = await getMobileAdminDashboard(auth.user.uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
