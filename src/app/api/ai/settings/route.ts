import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAISettings } from "@/lib/ai-studio/server-db";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_AI_SETTINGS, AI_SETTINGS_DOC_ID } from "@/lib/ai-studio/defaults";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getAISettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowed = [
      "provider",
      "openaiModel",
      "geminiModel",
      "aiEnabled",
      "dailyTokenLimit",
      "monthlyCostLimit",
      "requireApprovalForAIChanges",
      "defaultTone",
      "defaultLength",
    ];

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    allowed.forEach((key) => {
      if (body[key] !== undefined) update[key] = body[key];
    });

    await getAdminDb()
      .collection("settings")
      .doc(AI_SETTINGS_DOC_ID)
      .set({ ...DEFAULT_AI_SETTINGS, ...update }, { merge: true });

    const settings = await getAISettings();
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
