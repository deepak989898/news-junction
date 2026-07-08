import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAnalyticsSummary } from "@/lib/ai-analytics/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const range = (request.nextUrl.searchParams.get("range") || "7d") as "today" | "7d" | "30d";
    const data = await getAnalyticsSummary(range);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
