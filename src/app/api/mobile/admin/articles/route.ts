import { NextRequest, NextResponse } from "next/server";
import { canWrite, verifyMobileAdmin } from "../_utils";
import { getMobileAdminArticles, setMobileAdminArticleStatus } from "@/lib/mobile-admin/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const query = request.nextUrl.searchParams.get("query") || undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") || 50);
    const items = await getMobileAdminArticles({ status, query, limit });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifyMobileAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canWrite(auth.profile)) return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  try {
    const { articleId, status } = await request.json();
    if (!articleId || !status) return NextResponse.json({ error: "articleId and status required" }, { status: 400 });
    const valid = ["draft", "published", "archived", "rejected"];
    if (!valid.includes(String(status))) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const data = await setMobileAdminArticleStatus(String(articleId), String(status));
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
