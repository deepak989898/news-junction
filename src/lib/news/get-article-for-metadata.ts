import "server-only";

import { getAdminDb } from "@/lib/firebase-admin";

export type ArticleShareMeta = {
  slug: string;
  titleHi: string;
  titleEn: string;
  summaryHi: string;
  summaryEn: string;
  seoTitleHi?: string;
  seoTitleEn?: string;
  seoDescriptionHi?: string;
  seoDescriptionEn?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  imageUrl: string;
  imageLargeUrl?: string;
  imageWebpUrl?: string;
  imageMediumUrl?: string;
  author: string;
  tags: string[];
  status: string;
  publishedAtIso?: string;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  if (typeof v === "object" && v !== null && "_seconds" in v) {
    return new Date(Number((v as { _seconds: number })._seconds) * 1000).toISOString();
  }
  if (typeof v === "object" && v !== null && "seconds" in v) {
    return new Date(Number((v as { seconds: number }).seconds) * 1000).toISOString();
  }
  return undefined;
}

/** Server fetch for Open Graph / Twitter card metadata (crawlers do not run client JS). */
export async function getArticleShareMetaBySlug(slug: string): Promise<ArticleShareMeta | null> {
  if (!slug) return null;
  try {
    const snap = await getAdminDb().collection("news").where("slug", "==", slug).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as Record<string, unknown>;
    const status = asString(data.status) || "draft";
    if (status !== "published") return null;

    return {
      slug: asString(data.slug) || slug,
      titleHi: asString(data.titleHi),
      titleEn: asString(data.titleEn),
      summaryHi: asString(data.summaryHi),
      summaryEn: asString(data.summaryEn),
      seoTitleHi: asString(data.seoTitleHi) || undefined,
      seoTitleEn: asString(data.seoTitleEn) || undefined,
      seoDescriptionHi: asString(data.seoDescriptionHi) || undefined,
      seoDescriptionEn: asString(data.seoDescriptionEn) || undefined,
      ogTitle: asString(data.ogTitle) || undefined,
      ogDescription: asString(data.ogDescription) || undefined,
      twitterTitle: asString(data.twitterTitle) || undefined,
      twitterDescription: asString(data.twitterDescription) || undefined,
      imageUrl: asString(data.imageUrl),
      imageLargeUrl: asString(data.imageLargeUrl) || undefined,
      imageWebpUrl: asString(data.imageWebpUrl) || undefined,
      imageMediumUrl: asString(data.imageMediumUrl) || undefined,
      author: asString(data.author) || "News Junction Team",
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      status,
      publishedAtIso: toIso(data.publishedAt),
    };
  } catch {
    return null;
  }
}
