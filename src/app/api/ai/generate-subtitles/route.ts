import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateSubtitles } from "@/lib/ai-voice-video/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, language, script, format = "srt" } = await request.json();
    if (!articleId || !language || !script) {
      return NextResponse.json({ error: "articleId, language and script are required" }, { status: 400 });
    }
    if (!["hi", "en"].includes(language) || !["srt", "vtt"].includes(format)) {
      return NextResponse.json({ error: "Invalid language or format" }, { status: 400 });
    }
    const result = await generateSubtitles({
      articleId,
      language,
      script,
      format,
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subtitle generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
