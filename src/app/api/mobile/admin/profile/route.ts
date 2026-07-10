import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAdmin } from "../_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ profile: auth.profile });
}
