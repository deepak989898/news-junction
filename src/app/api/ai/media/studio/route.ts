import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getMediaStudioData } from "@/lib/ai-media/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getMediaStudioData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load media studio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
