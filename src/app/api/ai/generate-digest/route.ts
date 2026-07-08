import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateDigest } from "@/lib/ai-voice-video/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { digestType, articleIds = [] } = await request.json();
    if (!digestType || !Array.isArray(articleIds) || !articleIds.length) {
      return NextResponse.json({ error: "digestType and articleIds are required" }, { status: 400 });
    }
    const result = await generateDigest({
      digestType,
      articleIds,
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
