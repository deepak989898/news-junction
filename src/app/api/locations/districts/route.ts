import { NextRequest, NextResponse } from "next/server";
import { getDistrictsByState, getLocationDatasetMeta } from "@/lib/location/district-registry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const stateId = request.nextUrl.searchParams.get("stateId");
  if (!stateId) {
    return NextResponse.json({ error: "stateId required" }, { status: 400 });
  }

  const districts = getDistrictsByState(stateId);
  return NextResponse.json({
    stateId,
    districts,
    count: districts.length,
    meta: getLocationDatasetMeta(),
  });
}
