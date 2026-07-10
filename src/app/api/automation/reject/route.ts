import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { rejectRawNews } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rawNewsId, reason } = await request.json();
    if (!rawNewsId) {
      return NextResponse.json({ error: "rawNewsId required" }, { status: 400 });
    }

    await rejectRawNews(rawNewsId, reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reject failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
