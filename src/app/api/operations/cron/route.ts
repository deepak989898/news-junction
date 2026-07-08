import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { cronAction, getCronDashboard } from "@/lib/operations/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getCronDashboard();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cron dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { action, cronId, confirm } = await request.json();
    if (!confirm) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    const data = await cronAction({ action, cronId, actorUid: admin.uid });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
