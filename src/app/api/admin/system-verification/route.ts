import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, verifySuperAdmin } from "@/lib/auth/verify-admin";
import {
  buildFeatureRegistry,
  runVerificationTest,
  CRON_JOBS,
  VerificationTestId,
} from "@/lib/system-verification/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

const SENSITIVE_TESTS: VerificationTestId[] = ["ai_openai_ping", "social_tokens"];

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const features = buildFeatureRegistry();
  const envStatus = {
    firebasePublic: features.find((f) => f.id === "news_collection")?.status,
    firebaseAdmin: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_CLIENT_EMAIL),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    role: admin.role,
    features,
    cronJobs: CRON_JOBS,
    envStatus,
    docsBase: "/docs/hindi/",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const testId = body.testId as VerificationTestId | undefined;

  if (!testId) {
    return NextResponse.json({ error: "testId required" }, { status: 400 });
  }

  if (SENSITIVE_TESTS.includes(testId)) {
    const superAdmin = await verifySuperAdmin(request);
    if (!superAdmin) {
      return NextResponse.json({ error: "Super admin required for this test" }, { status: 403 });
    }
    const result = await runVerificationTest(testId, { superAdmin: true });
    return NextResponse.json({ success: result.ok, result });
  }

  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runVerificationTest(testId, { superAdmin: admin.role === "super_admin" });
  return NextResponse.json({ success: result.ok, result });
}
