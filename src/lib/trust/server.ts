import { cache } from "react";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSiteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/constants";
import type { SitePage, SitePageKey, TrustConfig, Author } from "@/lib/trust/types";
import { getDefaultSitePage } from "@/lib/trust/default-content";
import { getPolicyMeta } from "@/lib/trust/page-config";
import {
  DEFAULT_TRUST_CONFIG,
  TRUST_COLLECTION,
  TRUST_CONFIG_DOC_ID,
  SITE_PAGES_COLLECTION,
  AUTHORS_COLLECTION,
} from "@/lib/trust/defaults";

/** Convert Admin SDK Timestamp / Date / string to ISO string (or null). */
function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === "function") {
    try {
      return maybe.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Read a policy page, merging the Firestore document over the built-in default
 * content. Defaults always provide a complete, professional page so the site
 * never renders empty even before an admin edits anything.
 */
export const getSitePageServer = cache(
  async (key: SitePageKey): Promise<SitePage> => {
    const base = getDefaultSitePage(key);
    try {
      const snap = await getAdminDb()
        .collection(SITE_PAGES_COLLECTION)
        .doc(key)
        .get();
      if (!snap.exists) return base;
      const data = snap.data() as Partial<SitePage> | undefined;
      if (!data) return base;
      return {
        ...base,
        ...data,
        pageKey: key,
        sections:
          Array.isArray(data.sections) && data.sections.length > 0
            ? data.sections
            : base.sections,
        lastUpdatedAt: toIso(data.lastUpdatedAt) || base.lastUpdatedAt,
        createdAt: toIso(data.createdAt) || base.createdAt || null,
        updatedAt: toIso(data.updatedAt) || base.updatedAt || null,
      };
    } catch {
      return base;
    }
  }
);

export const getTrustConfigServer = cache(async (): Promise<TrustConfig> => {
  try {
    const snap = await getAdminDb()
      .collection(TRUST_COLLECTION)
      .doc(TRUST_CONFIG_DOC_ID)
      .get();
    if (!snap.exists) return DEFAULT_TRUST_CONFIG;
    return {
      ...DEFAULT_TRUST_CONFIG,
      ...(snap.data() as Partial<TrustConfig>),
      updatedAt: toIso(snap.data()?.updatedAt),
    };
  } catch {
    return DEFAULT_TRUST_CONFIG;
  }
});

function mapAuthor(id: string, data: FirebaseFirestore.DocumentData): Author {
  return {
    id,
    slug: String(data.slug || id),
    nameEn: String(data.nameEn || ""),
    nameHi: String(data.nameHi || ""),
    roleEn: String(data.roleEn || ""),
    roleHi: String(data.roleHi || ""),
    bioEn: String(data.bioEn || ""),
    bioHi: String(data.bioHi || ""),
    expertiseEn: Array.isArray(data.expertiseEn) ? data.expertiseEn : [],
    expertiseHi: Array.isArray(data.expertiseHi) ? data.expertiseHi : [],
    languages: Array.isArray(data.languages) ? data.languages : [],
    profileImageUrl: String(data.profileImageUrl || ""),
    emailPublic: String(data.emailPublic || ""),
    socialLinks: (data.socialLinks as Author["socialLinks"]) || {},
    coverageAreas: Array.isArray(data.coverageAreas) ? data.coverageAreas : [],
    isActive: data.isActive !== false,
    isVerified: data.isVerified === true,
    authorType: (data.authorType as Author["authorType"]) || "human",
    joinedAt: toIso(data.joinedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export const getAuthorsServer = cache(
  async (opts?: { activeOnly?: boolean }): Promise<Author[]> => {
    try {
      const snap = await getAdminDb().collection(AUTHORS_COLLECTION).get();
      let authors = snap.docs.map((d) => mapAuthor(d.id, d.data()));
      if (opts?.activeOnly !== false) {
        authors = authors.filter((a) => a.isActive);
      }
      authors.sort((a, b) => {
        // Team/system first, then alphabetical by English name.
        const rank = (t: Author["authorType"]) =>
          t === "editorial-team" ? 0 : t === "system" || t === "ai-assisted-desk" ? 1 : 2;
        const r = rank(a.authorType) - rank(b.authorType);
        if (r !== 0) return r;
        return a.nameEn.localeCompare(b.nameEn);
      });
      return authors;
    } catch {
      return [];
    }
  }
);

export const getAuthorBySlugServer = cache(
  async (slug: string): Promise<Author | null> => {
    try {
      const snap = await getAdminDb()
        .collection(AUTHORS_COLLECTION)
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return mapAuthor(doc.id, doc.data());
    } catch {
      return null;
    }
  }
);

export interface AuthorArticle {
  id: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  imageUrl: string;
  categoryNameHi: string;
  categoryNameEn: string;
  publishedAtIso: string | null;
}

/** Latest published articles attributed to an author (by authorId or name). */
export async function getAuthorArticlesServer(
  author: Author,
  max = 12
): Promise<AuthorArticle[]> {
  let db: ReturnType<typeof getAdminDb>;
  try {
    db = getAdminDb();
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const results: AuthorArticle[] = [];

  const push = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    if (seen.has(doc.id)) return;
    seen.add(doc.id);
    const data = doc.data();
    results.push({
      id: doc.id,
      slug: String(data.slug || doc.id),
      titleHi: String(data.titleHi || ""),
      titleEn: String(data.titleEn || ""),
      imageUrl: String(data.imageUrl || ""),
      categoryNameHi: String(data.categoryNameHi || ""),
      categoryNameEn: String(data.categoryNameEn || ""),
      publishedAtIso: toIso(data.publishedAt),
    });
  };

  const queries: FirebaseFirestore.Query[] = [];
  queries.push(
    db.collection("news").where("status", "==", "published").where("authorId", "==", author.id).limit(max)
  );
  for (const name of [author.nameEn, author.nameHi].filter(Boolean)) {
    queries.push(
      db.collection("news").where("status", "==", "published").where("author", "==", name).limit(max)
    );
  }

  for (const q of queries) {
    try {
      const snap = await q.get();
      snap.docs.forEach(push);
    } catch {
      // Missing composite index or field — ignore and continue.
    }
    if (results.length >= max) break;
  }

  results.sort((a, b) => (b.publishedAtIso || "").localeCompare(a.publishedAtIso || ""));
  return results.slice(0, max);
}

export async function getAuthorArticleCountServer(author: Author): Promise<number> {
  let db: ReturnType<typeof getAdminDb>;
  try {
    db = getAdminDb();
  } catch {
    return 0;
  }
  let total = 0;
  const tryCount = async (q: FirebaseFirestore.Query) => {
    try {
      const agg = await q.count().get();
      return agg.data().count as number;
    } catch {
      return 0;
    }
  };
  total += await tryCount(
    db.collection("news").where("status", "==", "published").where("authorId", "==", author.id)
  );
  if (total === 0 && author.nameEn) {
    total += await tryCount(
      db.collection("news").where("status", "==", "published").where("author", "==", author.nameEn)
    );
  }
  return total;
}

/** Lightweight, real stats for the About page (no fabricated numbers). */
export const getAboutStatsServer = cache(
  async (): Promise<{ categories: number; publishedArticles: number }> => {
    let publishedArticles = 0;
    let categories = 0;
    try {
      const db = getAdminDb();
      try {
        const agg = await db.collection("news").where("status", "==", "published").count().get();
        publishedArticles = agg.data().count as number;
      } catch {
        publishedArticles = 0;
      }
      try {
        const catSnap = await db.collection("categories").get();
        categories = catSnap.size;
      } catch {
        categories = 0;
      }
    } catch {
      return { categories: 0, publishedArticles: 0 };
    }
    return { categories, publishedArticles };
  }
);

/** Build Next.js metadata for a policy page (Hindi primary, canonical + OG). */
export function buildPolicyMetadata(page: SitePage): Metadata {
  const meta = getPolicyMeta(page.pageKey);
  const url = `${getSiteUrl()}${meta.path}`;
  const title = page.seoTitleHi || page.titleHi || meta.titleHi;
  const description = page.seoDescriptionHi || page.summaryHi || "";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: page.seoTitleEn || page.titleEn || meta.titleEn,
      description: page.seoDescriptionEn || page.summaryEn || description,
      url,
      siteName: BRAND.name,
      images: [{ url: `${getSiteUrl()}/logo.png`, width: 512, height: 512, alt: BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitleEn || page.titleEn || meta.titleEn,
      description: page.seoDescriptionEn || page.summaryEn || description,
      images: [`${getSiteUrl()}/logo.png`],
    },
    robots: page.published ? { index: true, follow: true } : { index: false, follow: true },
  };
}
