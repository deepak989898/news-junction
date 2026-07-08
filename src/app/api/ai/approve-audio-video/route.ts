import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { approveAudioVideo, updateTtsSettings } from "@/lib/ai-voice-video/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { type, id, action, patch, operation } = await request.json();

    if (operation === "update_tts_settings") {
      if (admin.role !== "super_admin") {
        return NextResponse.json({ error: "Super admin required" }, { status: 403 });
      }
      const settings = await updateTtsSettings((patch || {}) as Record<string, unknown>);
      return NextResponse.json(settings);
    }

    if (!type || !id || !action) {
      return NextResponse.json({ error: "type, id and action are required" }, { status: 400 });
    }
    const result = await approveAudioVideo({
      type,
      id,
      action,
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
