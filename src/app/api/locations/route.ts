import { NextResponse } from "next/server";
import { getAllStates, getDistrictsByState, getCitiesByState } from "@/lib/location/service";

/** Shared location dataset for web + mobile — single source of truth */
export async function GET() {
  const states = getAllStates();
  return NextResponse.json({
    states,
    districts: states.flatMap((s) => getDistrictsByState(s.id)),
    cities: states.flatMap((s) => getCitiesByState(s.id)),
  });
}
