import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { approveAndPublishRawNews } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rawNewsId } = await request.json();
    if (!rawNewsId) {
      return NextResponse.json({ error: "rawNewsId required" }, { status: 400 });
    }

    const newsId = await approveAndPublishRawNews(rawNewsId);
    return NextResponse.json({ success: true, newsId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
