import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getWorkflows, runWorkflow, saveWorkflow } from "@/lib/orchestrator/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getWorkflows();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body.action || "");
    if (action === "run") {
      const data = await runWorkflow(String(body.workflowId), {
        trigger: String(body.trigger || "manual"),
        initiatedBy: admin.uid,
        priority: body.priority,
        payload: body.payload || {},
      });
      return NextResponse.json(data);
    }
    if (!admin || admin.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin required" }, { status: 403 });
    }
    const data = await saveWorkflow(action as "create" | "update" | "delete", body, admin.uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
