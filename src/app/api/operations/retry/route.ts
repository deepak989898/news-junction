import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { cronAction, queueAction } from "@/lib/operations/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { mode, queue, jobId, cronId, confirm } = await request.json();
    if (!confirm) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    if (mode === "queue") {
      const data = await queueAction({
        action: "retry_failed",
        queue,
        jobId,
        actorUid: admin.uid,
      });
      return NextResponse.json(data);
    }
    if (mode === "cron") {
      const data = await cronAction({
        action: "retry_failed_execution",
        cronId,
        actorUid: admin.uid,
      });
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retry failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
