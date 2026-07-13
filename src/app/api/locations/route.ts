import { NextRequest, NextResponse } from "next/server";
import { getAllStates } from "@/lib/location/states";
import { getLocationDatasetMeta } from "@/lib/location/district-registry";

export const runtime = "nodejs";

/** States list + dataset meta (lightweight, safe for all clients) */
export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get("resource") || "states";

  if (resource === "meta") {
    return NextResponse.json(getLocationDatasetMeta());
  }

  return NextResponse.json({
    states: getAllStates(),
    meta: getLocationDatasetMeta(),
  });
}
