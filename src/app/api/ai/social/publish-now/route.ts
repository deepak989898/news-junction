import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { publishPostImmediately } from "@/lib/ai-social/service";
import { SocialPlatform } from "@/lib/ai-social/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const {
      articleId,
      platform,
      text,
      hashtags = [],
      cta = "Read full story on News Junction.",
      imageUrl,
      language = "en",
    } = body;
    if (!articleId || !platform || !text) {
      return NextResponse.json({ error: "articleId, platform, text required" }, { status: 400 });
    }
    const result = await publishPostImmediately({
      articleId,
      platform: platform as SocialPlatform,
      text,
      hashtags,
      cta,
      imageUrl,
      language,
      createdBy: admin.uid,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
