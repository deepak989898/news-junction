import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { getAiCenterData } from "@/lib/mobile-ai/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getAiCenterData(user.uid);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load AI center";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
