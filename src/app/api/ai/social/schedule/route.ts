import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { schedulePost } from "@/lib/ai-social/service";
import { SocialPlatform } from "@/lib/ai-social/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      scheduledAt,
      approvalStatus = "pending",
      campaignId,
    } = body;
    if (!articleId || !platform || !text) {
      return NextResponse.json({ error: "articleId, platform, text required" }, { status: 400 });
    }
    const item = await schedulePost({
      articleId,
      platform: platform as SocialPlatform,
      campaignId,
      text,
      hashtags,
      cta,
      imageUrl,
      language,
      status: scheduledAt ? "scheduled" : "pending",
      scheduledAt,
      approvalStatus,
      createdBy: admin.uid,
    });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
