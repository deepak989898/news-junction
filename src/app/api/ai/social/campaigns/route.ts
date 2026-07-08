import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createCampaign } from "@/lib/ai-social/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const campaign = await createCampaign({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      platforms: body.platforms || [],
      categories: body.categories || [],
      status: body.status || "draft",
      createdBy: admin.uid,
    });
    return NextResponse.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
