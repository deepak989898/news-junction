import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { CONTACT_SUBMISSIONS_COLLECTION } from "@/lib/trust/defaults";
import type { ContactStatus } from "@/lib/trust/types";

export const runtime = "nodejs";

const VALID_STATUS = new Set<ContactStatus>(["new", "in-progress", "resolved", "archived"]);

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  const m = v as { toDate?: () => Date };
  return typeof m.toDate === "function" ? m.toDate().toISOString() : null;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const statusFilter = params.get("status") || "";
  const categoryFilter = params.get("category") || "";

  const db = getAdminDb();
  let rows: Array<Record<string, unknown>> = [];
  try {
    const snap = await db
      .collection(CONTACT_SUBMISSIONS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();
    rows = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        category: data.category || "general",
        subject: data.subject || "",
        message: data.message || "",
        articleUrl: data.articleUrl || "",
        language: data.language || "hi",
        status: (data.status as ContactStatus) || "new",
        internalNotes: data.internalNotes || "",
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch {
    rows = [];
  }

  let filtered = rows;
  if (statusFilter && VALID_STATUS.has(statusFilter as ContactStatus)) {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }
  if (categoryFilter) {
    filtered = filtered.filter((r) => r.category === categoryFilter);
  }

  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    "in-progress": rows.filter((r) => r.status === "in-progress").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    archived: rows.filter((r) => r.status === "archived").length,
    total: rows.length,
  };

  return NextResponse.json({ submissions: filtered, counts });
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    internalNotes?: string;
  };
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status && VALID_STATUS.has(body.status as ContactStatus)) {
    update.status = body.status;
  }
  if (typeof body.internalNotes === "string") {
    update.internalNotes = body.internalNotes.slice(0, 5000);
  }

  await getAdminDb().collection(CONTACT_SUBMISSIONS_COLLECTION).doc(id).set(update, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admin can delete submissions." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await getAdminDb().collection(CONTACT_SUBMISSIONS_COLLECTION).doc(id).delete();
  return NextResponse.json({ ok: true });
}
