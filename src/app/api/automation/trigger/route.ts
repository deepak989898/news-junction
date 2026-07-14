import { NextRequest, NextResponse } from "next/server";
import { runFetchNews, runProcessNews } from "@/lib/automation/fetch-pipeline";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PROCESS_BATCH = 1;

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "fetch") {
      const result = await runFetchNews();
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "process") {
      const requested = Number(body.batchSize) || 1;
      const batchSize = Math.min(Math.max(requested, 1), MAX_PROCESS_BATCH);
      const result = await runProcessNews(batchSize);
      return NextResponse.json({ success: true, batchSize, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger failed";
    if (message.includes("Firebase Admin credentials missing")) {
      return NextResponse.json(
        { error: "Firebase Admin not configured on Vercel. Set FIREBASE_SERVICE_ACCOUNT_KEY." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
