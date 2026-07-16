import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/newsletter/send";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* allow query token */
  }

  const token =
    String(body.token || "").trim() ||
    request.nextUrl.searchParams.get("token") ||
    "";

  const result = await unsubscribeByToken(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: result.email });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const result = await unsubscribeByToken(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: result.email });
}
