import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAggregatedMediaLibrary } from "@/lib/media-library/service";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 300);
    const items = await getAggregatedMediaLibrary(Math.min(Math.max(limit, 1), 500));
    return NextResponse.json({
      items,
      counts: {
        total: items.length,
        upload: items.filter((i) => i.source === "upload").length,
        ai_media: items.filter((i) => i.source === "ai_media").length,
        article_pipeline: items.filter((i) => i.source === "article_pipeline").length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load media library";
    console.error("media library failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
