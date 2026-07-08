import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { getBookmarks, removeBookmark, upsertBookmark } from "@/lib/personalization/service";
import { getMaintenanceState, isUidAdmin } from "@/lib/operations/maintenance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const query = request.nextUrl.searchParams.get("query") || undefined;
    const category = request.nextUrl.searchParams.get("category") || undefined;
    const data = await getBookmarks(user.uid, { query, category });
    return NextResponse.json({ items: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load bookmarks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && !(await isUidAdmin(user.uid)) && !maintenance.adminWhitelist.includes(user.uid)) {
      return NextResponse.json({ error: maintenance.message }, { status: 503 });
    }
    const { articleId, title, slug, categoryName, language } = await request.json();
    if (!articleId || !title || !slug) {
      return NextResponse.json({ error: "articleId, title and slug required" }, { status: 400 });
    }
    const data = await upsertBookmark(user.uid, { articleId, title, slug, categoryName, language });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add bookmark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && !(await isUidAdmin(user.uid)) && !maintenance.adminWhitelist.includes(user.uid)) {
      return NextResponse.json({ error: maintenance.message }, { status: 503 });
    }
    const { articleId } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const data = await removeBookmark(user.uid, articleId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove bookmark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
