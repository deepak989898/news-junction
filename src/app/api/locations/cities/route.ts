import { NextRequest, NextResponse } from "next/server";
import {
  getCitiesByDistrict,
  getCitiesByState,
  getCityById,
} from "@/lib/location/district-registry";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get("cityId");
  if (cityId) {
    const city = getCityById(cityId);
    if (!city) return NextResponse.json({ error: "City not found" }, { status: 404 });
    return NextResponse.json({ city });
  }

  const stateId = request.nextUrl.searchParams.get("stateId");
  const districtId = request.nextUrl.searchParams.get("districtId");

  if (districtId) {
    const cities = getCitiesByDistrict(districtId);
    return NextResponse.json({ districtId, cities, count: cities.length });
  }

  if (stateId) {
    const cities = getCitiesByState(stateId);
    return NextResponse.json({ stateId, cities, count: cities.length });
  }

  return NextResponse.json({ error: "stateId, districtId, or cityId required" }, { status: 400 });
}
