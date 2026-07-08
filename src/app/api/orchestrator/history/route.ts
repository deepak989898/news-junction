import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getHistory } from "@/lib/orchestrator/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const workflowId = request.nextUrl.searchParams.get("workflowId") || undefined;
    const q = request.nextUrl.searchParams.get("q") || undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") || 120);
    const data = await getHistory({ status, workflowId, q, limit });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflow history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
