import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { generateRecommendations, markRecommendationClick } from "@/lib/personalization/service";
import { getMaintenanceState, isUidAdmin } from "@/lib/operations/maintenance";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await generateRecommendations(user.uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const maintenance = await getMaintenanceState();
    if (maintenance.enabled && !(await isUidAdmin(user.uid)) && !maintenance.adminWhitelist.includes(user.uid)) {
      return NextResponse.json({ error: maintenance.message }, { status: 503 });
    }
    const { action, articleId } = await request.json();
    if (action === "refresh") {
      const data = await generateRecommendations(user.uid);
      return NextResponse.json(data);
    }
    if (action === "click") {
      if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });
      const data = await markRecommendationClick(user.uid, articleId);
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update recommendation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
