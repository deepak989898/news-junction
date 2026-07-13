import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import {
  backfillArticleLocations,
  getLocationCoverageReport,
  seedLocationsToFirestore,
} from "@/lib/location/admin-coverage";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await getLocationCoverageReport();
  return NextResponse.json(report);
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: "backfill" | "seed";
    limit?: number;
    dryRun?: boolean;
  };

  if (body.action === "seed") {
    const counts = await seedLocationsToFirestore();
    return NextResponse.json({ ok: true, counts });
  }

  const result = await backfillArticleLocations({
    limit: body.limit ?? 100,
    dryRun: body.dryRun ?? false,
  });
  return NextResponse.json(result);
}
