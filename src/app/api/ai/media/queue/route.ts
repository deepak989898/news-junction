import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getQueueSnapshot, updateQueueStatus } from "@/lib/ai-media/service";
import { MediaStatus } from "@/lib/ai-media/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const queue = await getQueueSnapshot(120);
    return NextResponse.json({ queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
    await updateQueueStatus(id, status as MediaStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update queue status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
