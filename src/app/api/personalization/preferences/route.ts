import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { getUserPreferences, updateUserPreferences } from "@/lib/personalization/service";
import { getMaintenanceState, isUidAdmin } from "@/lib/operations/maintenance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const prefs = await getUserPreferences(user.uid);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && !(await isUidAdmin(user.uid)) && !maintenance.adminWhitelist.includes(user.uid)) {
      return NextResponse.json({ error: maintenance.message }, { status: 503 });
    }
    const body = await request.json();
    const prefs = await updateUserPreferences(user.uid, body);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
