import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getRecentLogs, getPendingChanges } from "@/lib/ai-studio/server-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [logs, pending] = await Promise.all([getRecentLogs(30), getPendingChanges(30)]);
    return NextResponse.json({ logs, pending });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
