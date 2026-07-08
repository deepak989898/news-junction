import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { emergencyAction } from "@/lib/orchestrator/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (!body.confirm) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    const data = await emergencyAction(body.action, admin.uid, { moduleId: body.moduleId });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to execute emergency action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
