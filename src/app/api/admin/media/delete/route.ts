import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { deleteMediaLibraryItem } from "@/lib/media-library/service";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can delete media" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const itemId = String(body.itemId || "");
    const url = String(body.url || "");
    const thumbnailUrl = body.thumbnailUrl ? String(body.thumbnailUrl) : undefined;
    if (!itemId || !url) {
      return NextResponse.json({ error: "itemId and url required" }, { status: 400 });
    }

    const result = await deleteMediaLibraryItem({
      itemId,
      url,
      thumbnailUrl,
      deletedBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
