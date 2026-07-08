import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getQueueDashboard, queueAction } from "@/lib/operations/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const service = request.nextUrl.searchParams.get("service") || undefined;
    const q = request.nextUrl.searchParams.get("q") || undefined;
    const data = await getQueueDashboard(service, q);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load queues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { action, queue, jobId } = await request.json();
    const data = await queueAction({ action, queue, jobId, actorUid: admin.uid });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
