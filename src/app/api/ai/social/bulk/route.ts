import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { bulkAction } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { queueIds = [], action } = await request.json();
    if (!Array.isArray(queueIds) || !action) {
      return NextResponse.json({ error: "queueIds and action required" }, { status: 400 });
    }
    const result = await bulkAction({ queueIds, action, usedBy: admin.uid });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
