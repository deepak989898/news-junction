import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { processEditorialQueue } from "@/lib/ai-editorial/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { limit = 10 } = await request.json().catch(() => ({ limit: 10 }));
    const result = await processEditorialQueue(Number(limit || 10));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
