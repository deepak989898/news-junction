import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAdmin } from "../_utils";
import { mobileAdminSearch } from "@/lib/mobile-admin/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { query } = await request.json();
    const q = String(query || "").trim();
    if (!q) return NextResponse.json({ results: [] });
    const results = await mobileAdminSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
