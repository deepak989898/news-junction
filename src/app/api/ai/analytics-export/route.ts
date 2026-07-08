import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { exportAnalytics } from "@/lib/ai-analytics/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { format = "csv", reportType = "daily" } = await request.json().catch(() => ({ format: "csv", reportType: "daily" }));
    if (!["csv", "excel", "pdf"].includes(String(format))) {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
    }
    if (!["daily", "weekly", "monthly"].includes(String(reportType))) {
      return NextResponse.json({ error: "Invalid reportType" }, { status: 400 });
    }
    const data = await exportAnalytics({ format, reportType, createdBy: admin.uid });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
