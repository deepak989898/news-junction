import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSitePageServer } from "@/lib/trust/server";
import { getDefaultSitePage } from "@/lib/trust/default-content";
import { POLICY_PAGES, POLICY_PAGE_MAP } from "@/lib/trust/page-config";
import { SITE_PAGES_COLLECTION } from "@/lib/trust/defaults";
import type { SitePage, SitePageKey, PolicySection } from "@/lib/trust/types";

export const runtime = "nodejs";

function isValidKey(key: string): key is SitePageKey {
  return key in POLICY_PAGE_MAP;
}

function sanitizeSections(input: unknown): PolicySection[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 50).map((s, i) => {
    const sec = (s || {}) as Record<string, unknown>;
    return {
      id: String(sec.id || `section-${i + 1}`).slice(0, 60),
      headingEn: String(sec.headingEn || "").slice(0, 300),
      headingHi: String(sec.headingHi || "").slice(0, 300),
      bodyEn: String(sec.bodyEn || "").slice(0, 20000),
      bodyHi: String(sec.bodyHi || "").slice(0, 20000),
      order: Number.isFinite(Number(sec.order)) ? Number(sec.order) : i,
      highlight: sec.highlight === true,
    };
  });
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");

  if (key) {
    if (!isValidKey(key)) return NextResponse.json({ error: "Unknown page" }, { status: 404 });
    const page = await getSitePageServer(key);
    return NextResponse.json({ page });
  }

  // Summary list for the hub.
  const db = getAdminDb();
  const pages = await Promise.all(
    POLICY_PAGES.map(async (meta) => {
      let published = true;
      let version = 1;
      let lastUpdatedAt: string | null = null;
      let saved = false;
      try {
        const snap = await db.collection(SITE_PAGES_COLLECTION).doc(meta.key).get();
        if (snap.exists) {
          saved = true;
          const d = snap.data() as Partial<SitePage>;
          published = d.published !== false;
          version = Number(d.version || 1);
          const lu = d.lastUpdatedAt as unknown;
          lastUpdatedAt =
            typeof lu === "string"
              ? lu
              : (lu as { toDate?: () => Date })?.toDate?.().toISOString() || null;
        } else {
          const def = getDefaultSitePage(meta.key);
          published = def.published;
          version = def.version;
          lastUpdatedAt = def.lastUpdatedAt;
        }
      } catch {
        /* ignore */
      }
      return {
        key: meta.key,
        slug: meta.slug,
        path: meta.path,
        titleEn: meta.titleEn,
        titleHi: meta.titleHi,
        group: meta.group,
        editPermission: meta.editPermission,
        legalReview: meta.legalReview || false,
        published,
        version,
        lastUpdatedAt,
        saved,
      };
    })
  );

  return NextResponse.json({ pages });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { key?: string; page?: Partial<SitePage> };
  const key = body.key;
  if (!key || !isValidKey(key)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 400 });
  }

  const meta = POLICY_PAGE_MAP[key];
  if (meta.editPermission === "super_admin" && admin.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only a super admin can edit this page." },
      { status: 403 }
    );
  }

  const input = body.page || {};
  const base = getDefaultSitePage(key);
  const db = getAdminDb();

  // Preserve/increment version from stored doc.
  let prevVersion = base.version;
  try {
    const snap = await db.collection(SITE_PAGES_COLLECTION).doc(key).get();
    if (snap.exists) prevVersion = Number(snap.data()?.version || base.version);
  } catch {
    /* ignore */
  }

  const now = new Date().toISOString();
  const sections = sanitizeSections(input.sections);

  const page: SitePage = {
    pageKey: key,
    titleEn: String(input.titleEn ?? base.titleEn).slice(0, 200),
    titleHi: String(input.titleHi ?? base.titleHi).slice(0, 200),
    summaryEn: String(input.summaryEn ?? base.summaryEn).slice(0, 1000),
    summaryHi: String(input.summaryHi ?? base.summaryHi).slice(0, 1000),
    sections: sections.length ? sections : base.sections,
    lastUpdatedAt: now,
    published: input.published !== false,
    seoTitleEn: String(input.seoTitleEn ?? base.seoTitleEn).slice(0, 200),
    seoTitleHi: String(input.seoTitleHi ?? base.seoTitleHi).slice(0, 200),
    seoDescriptionEn: String(input.seoDescriptionEn ?? base.seoDescriptionEn).slice(0, 400),
    seoDescriptionHi: String(input.seoDescriptionHi ?? base.seoDescriptionHi).slice(0, 400),
    version: prevVersion + 1,
    updatedBy: admin.email || admin.uid,
    createdAt: base.createdAt || now,
    updatedAt: now,
  };

  await db.collection(SITE_PAGES_COLLECTION).doc(key).set(page, { merge: true });

  return NextResponse.json({ ok: true, page });
}
