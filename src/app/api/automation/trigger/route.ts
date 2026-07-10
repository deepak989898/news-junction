import { NextRequest, NextResponse } from "next/server";
import { runFetchNews, runProcessNews } from "@/lib/automation/fetch-pipeline";
import { verifySuperAdmin } from "@/lib/auth/verify-admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Super admin required" }, { status: 401 });
    }

    const { action } = await request.json();
    if (action === "fetch") {
      const result = await runFetchNews();
      return NextResponse.json({ success: true, ...result });
    }
    if (action === "process") {
      const result = await runProcessNews(15);
      return NextResponse.json({ success: true, ...result });
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
