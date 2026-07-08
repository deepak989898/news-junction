import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateAnalyticsReport } from "@/lib/ai-analytics/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { reportType = "daily" } = await request.json().catch(() => ({ reportType: "daily" }));
    if (!["daily", "weekly", "monthly"].includes(String(reportType))) {
      return NextResponse.json({ error: "Invalid reportType" }, { status: 400 });
    }
    const report = await generateAnalyticsReport({ reportType, createdBy: admin.uid });
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
