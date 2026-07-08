import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { processMediaQueue } from "@/lib/ai-media/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { limit = 10 } = await request.json().catch(() => ({ limit: 10 }));
    const result = await processMediaQueue(Number(limit || 10));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
