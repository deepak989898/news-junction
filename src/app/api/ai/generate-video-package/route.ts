import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateVideoPackage } from "@/lib/ai-voice-video/service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, language, platform, script, audioAssetId, subtitleUrl, caption, hashtags = [] } = await request.json();
    if (!articleId || !language || !platform || !script) {
      return NextResponse.json({ error: "articleId, language, platform and script are required" }, { status: 400 });
    }
    const result = await generateVideoPackage({
      articleId,
      language,
      platform,
      script,
      audioAssetId,
      subtitleUrl,
      caption: caption || "",
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video package generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
