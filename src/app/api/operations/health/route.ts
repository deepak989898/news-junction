import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getDependencyStatus, getHealthDashboard, getPerformanceMonitor } from "@/lib/operations/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const [health, dependencies, performance] = await Promise.all([
      getHealthDashboard(force),
      getDependencyStatus(),
      getPerformanceMonitor(),
    ]);
    return NextResponse.json({ ...health, dependencies, performance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load health dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
