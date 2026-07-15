import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { createSlug } from "@/lib/utils";
import { AUTHORS_COLLECTION } from "@/lib/trust/defaults";
import { AUTHOR_TYPES, type Author, type AuthorType } from "@/lib/trust/types";

export const runtime = "nodejs";

const VALID_TYPES = new Set(AUTHOR_TYPES.map((t) => t.value));

function toStringArray(v: unknown, max = 20): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).slice(0, max);
  if (typeof v === "string")
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, max);
  return [];
}

function sanitizeAuthor(input: Record<string, unknown>): Omit<Author, "id" | "slug" | "createdAt" | "updatedAt"> {
  const type = String(input.authorType || "human") as AuthorType;
  const social = (input.socialLinks || {}) as Record<string, unknown>;
  return {
    nameEn: String(input.nameEn || "").slice(0, 120),
    nameHi: String(input.nameHi || "").slice(0, 120),
    roleEn: String(input.roleEn || "").slice(0, 160),
    roleHi: String(input.roleHi || "").slice(0, 160),
    bioEn: String(input.bioEn || "").slice(0, 3000),
    bioHi: String(input.bioHi || "").slice(0, 3000),
    expertiseEn: toStringArray(input.expertiseEn),
    expertiseHi: toStringArray(input.expertiseHi),
    languages: toStringArray(input.languages, 8),
    profileImageUrl: String(input.profileImageUrl || "").slice(0, 600),
    emailPublic: String(input.emailPublic || "").slice(0, 200),
    socialLinks: {
      x: String(social.x || "").slice(0, 300),
      facebook: String(social.facebook || "").slice(0, 300),
      instagram: String(social.instagram || "").slice(0, 300),
      linkedin: String(social.linkedin || "").slice(0, 300),
      website: String(social.website || "").slice(0, 300),
    },
    coverageAreas: toStringArray(input.coverageAreas),
    isActive: input.isActive !== false,
    isVerified: input.isVerified === true,
    authorType: VALID_TYPES.has(type) ? type : "human",
    joinedAt: input.joinedAt ? String(input.joinedAt) : null,
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const db = getAdminDb();
  let slug = base || "author";
  let n = 1;
  // Try up to a few variants.
  for (let i = 0; i < 25; i++) {
    const snap = await db.collection(AUTHORS_COLLECTION).where("slug", "==", slug).limit(1).get();
    if (snap.empty || (excludeId && snap.docs[0].id === excludeId)) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await getAdminDb().collection(AUTHORS_COLLECTION).get();
  const authors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  authors.sort((a, b) =>
    String((a as { nameEn?: string }).nameEn || "").localeCompare(String((b as { nameEn?: string }).nameEn || ""))
  );
  return NextResponse.json({ authors });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data = sanitizeAuthor(body);
  if (!data.nameEn && !data.nameHi) {
    return NextResponse.json({ error: "Author name is required." }, { status: 400 });
  }

  const requestedSlug = String(body.slug || "").trim();
  const base = createSlug(requestedSlug || data.nameEn || data.nameHi);
  const slug = await uniqueSlug(base);

  const now = new Date().toISOString();
  const doc = await getAdminDb()
    .collection(AUTHORS_COLLECTION)
    .add({ ...data, slug, joinedAt: data.joinedAt || now, createdAt: now, updatedAt: now });

  return NextResponse.json({ ok: true, id: doc.id, slug });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "Missing author id" }, { status: 400 });

  const data = sanitizeAuthor(body);
  const db = getAdminDb();

  let slug = String(body.slug || "").trim();
  if (slug) slug = await uniqueSlug(createSlug(slug), id);
  else {
    const existing = await db.collection(AUTHORS_COLLECTION).doc(id).get();
    slug = String(existing.data()?.slug || (await uniqueSlug(createSlug(data.nameEn || data.nameHi), id)));
  }

  await db
    .collection(AUTHORS_COLLECTION)
    .doc(id)
    .set({ ...data, slug, updatedAt: new Date().toISOString() }, { merge: true });

  return NextResponse.json({ ok: true, id, slug });
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id =
    new URL(request.url).searchParams.get("id") ||
    (((await request.json().catch(() => ({}))) as { id?: string }).id ?? "");
  if (!id) return NextResponse.json({ error: "Missing author id" }, { status: 400 });

  await getAdminDb().collection(AUTHORS_COLLECTION).doc(String(id)).delete();
  return NextResponse.json({ ok: true });
}
