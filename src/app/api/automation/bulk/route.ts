import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, verifySuperAdmin } from "@/lib/auth/verify-admin";
import { deleteRawNewsItems } from "@/lib/automation/server-db";
import { rejectRawNews } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || "");
    const rawNewsIds = Array.isArray(body.rawNewsIds)
      ? body.rawNewsIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    if (!rawNewsIds.length) {
      return NextResponse.json({ error: "rawNewsIds required" }, { status: 400 });
    }

    if (action === "reject") {
      const admin = await verifyAdmin(request);
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      let success = 0;
      const errors: string[] = [];
      for (const rawNewsId of rawNewsIds) {
        try {
          await rejectRawNews(rawNewsId, body.reason || "Rejected by admin (bulk)");
          success++;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `Failed: ${rawNewsId}`);
        }
      }

      return NextResponse.json({ success: true, processed: success, failed: rawNewsIds.length - success, errors });
    }

    if (action === "delete") {
      const admin = await verifySuperAdmin(request);
      if (!admin) {
        return NextResponse.json({ error: "Super admin required" }, { status: 401 });
      }

      const deleted = await deleteRawNewsItems(rawNewsIds);
      return NextResponse.json({ success: true, deleted });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
