import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateVoiceScript } from "@/lib/ai-voice-video/service";
import { VOICE_SCRIPT_ACTIONS } from "@/lib/ai-voice-video/defaults";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, action, language = "hi" } = await request.json();
    if (!articleId || !action) {
      return NextResponse.json({ error: "articleId and action required" }, { status: 400 });
    }
    if (!VOICE_SCRIPT_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!["hi", "en"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    const result = await generateVoiceScript({
      articleId,
      action,
      language,
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Script generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
