import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { generateSocialContent } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { articleId, breaking = false } = await request.json();
    if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
    const result = await generateSocialContent(articleId, { breaking });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate social content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
