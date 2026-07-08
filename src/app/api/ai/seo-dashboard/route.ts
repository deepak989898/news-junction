import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getSeoDashboardData } from "@/lib/ai-seo/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await getSeoDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load SEO dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
