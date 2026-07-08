import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getTemplates, upsertTemplate } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const templates = await getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "superAdmin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    await upsertTemplate(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
