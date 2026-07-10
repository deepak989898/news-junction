import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin, verifyMobileAdmin } from "../_utils";
import { getMobileAdminUsers, updateMobileAdminUser } from "@/lib/mobile-admin/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isSuperAdmin(auth.profile)) return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  try {
    const items = await getMobileAdminUsers();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!isSuperAdmin(auth.profile)) return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  try {
    const { uid, ...patch } = await request.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
    const data = await updateMobileAdminUser(String(uid), patch as Record<string, unknown>);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
