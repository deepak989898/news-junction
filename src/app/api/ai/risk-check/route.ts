import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { executeRiskCheck } from "@/lib/ai-studio/content-actions";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: "articleId required" }, { status: 400 });
    }

    const result = await executeRiskCheck(articleId, admin.uid);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Risk check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
