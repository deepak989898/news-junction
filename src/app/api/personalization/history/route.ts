import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { addReadingHistory, getReadingHistory } from "@/lib/personalization/service";
import { getMaintenanceState, isUidAdmin } from "@/lib/operations/maintenance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 40);
    const offset = Number(request.nextUrl.searchParams.get("offset") || 0);
    const items = await getReadingHistory(user.uid, limit, offset);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load history";
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
    const { articleId, readingTimeSec = 0, completed = false, categoryId, categoryName, topicTags } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const item = await addReadingHistory(user.uid, {
      articleId,
      readingTimeSec,
      completed,
      categoryId,
      categoryName,
      topicTags,
    });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
