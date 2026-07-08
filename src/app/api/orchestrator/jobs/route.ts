import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getJobs, updateJob } from "@/lib/orchestrator/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = (request.nextUrl.searchParams.get("status") || undefined) as
      | "queued"
      | "running"
      | "completed"
      | "failed"
      | "retrying"
      | "cancelled"
      | undefined;
    const priority = (request.nextUrl.searchParams.get("priority") || undefined) as
      | "critical"
      | "high"
      | "medium"
      | "low"
      | "background"
      | undefined;
    const workflowExecutionId = request.nextUrl.searchParams.get("workflowExecutionId") || undefined;
    const q = request.nextUrl.searchParams.get("q") || undefined;
    const data = await getJobs({ status, priority, workflowExecutionId, q });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { action, jobId, confirm } = await request.json();
    if (!confirm) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    const data = await updateJob(action, jobId, admin.uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
