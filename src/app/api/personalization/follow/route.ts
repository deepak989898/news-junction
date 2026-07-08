import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { getFollows, updateFollows } from "@/lib/personalization/service";
import { getMaintenanceState, isUidAdmin } from "@/lib/operations/maintenance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const follows = await getFollows(user.uid);
    return NextResponse.json(follows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load follows";
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
    const { target, action, value } = await request.json();
    if (!target || !action || !value) {
      return NextResponse.json({ error: "target, action and value required" }, { status: 400 });
    }
    if (!["categories", "topics", "authors", "locations"].includes(String(target))) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }
    if (!["follow", "unfollow"].includes(String(action))) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const data = await updateFollows(user.uid, { target, action, value });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update follow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
