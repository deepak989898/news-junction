import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import {
  backfillArticleLocations,
  getLocationCoverageReport,
  seedLocationPhase,
  seedLocationsToFirestore,
} from "@/lib/location/admin-coverage";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const report = await getLocationCoverageReport();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "backfill" | "seed" | "seedChunk";
      phase?: "states" | "districts" | "cities";
      offset?: number;
      limit?: number;
      dryRun?: boolean;
    };

    if (body.action === "seedChunk" && body.phase) {
      const result = await seedLocationPhase(
        body.phase,
        body.offset ?? 0,
        body.limit ?? 200
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "seed") {
      const counts = await seedLocationsToFirestore();
      return NextResponse.json({ ok: true, counts });
    }

    const result = await backfillArticleLocations({
      limit: body.limit ?? 100,
      dryRun: body.dryRun ?? false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 }
    );
  }
}
