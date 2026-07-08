import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { processSocialQueue } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const { limit = 20 } = await request.json().catch(() => ({ limit: 20 }));
    const result = await processSocialQueue(Number(limit || 20));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process social queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
