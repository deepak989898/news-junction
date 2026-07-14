import { getAdminDb } from "@/lib/firebase-admin";

export type MediaLibrarySource = "upload" | "ai_media" | "article_pipeline";

export type MediaLibraryItem = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  altHi: string;
  altEn: string;
  uploadedBy: string;
  size: number;
  contentType: string;
  source: MediaLibrarySource;
  articleId?: string;
  createdAt: string | null;
  deletable: boolean;
};

function asString(v: unknown) {
  return String(v || "");
}

function createdAtIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function filenameFromUrl(url: string, fallback: string) {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").filter(Boolean).pop() || fallback;
    return decodeURIComponent(name);
  } catch {
    return fallback;
  }
}

function isHostedAsset(url: string) {
  if (!url) return false;
  return (
    url.includes("storage.googleapis.com") ||
    url.includes("firebasestorage.googleapis.com") ||
    url.startsWith("/images/")
  );
}

function isLikelyFallback(url: string) {
  return url.includes("/images/fallbacks/") || url.includes("/logo") || url.endsWith("/logo.png");
}

/** Persist so Media Library + MediaPicker stay in sync going forward. */
export async function upsertMediaLibraryEntry(entry: {
  url: string;
  filename?: string;
  altHi?: string;
  altEn?: string;
  uploadedBy?: string;
  size?: number;
  contentType?: string;
  source?: MediaLibrarySource;
  articleId?: string;
}): Promise<string | null> {
  const url = asString(entry.url).trim();
  if (!url || !isHostedAsset(url) || isLikelyFallback(url)) return null;

  const db = getAdminDb();
  try {
    const existing = await db.collection("media").where("url", "==", url).limit(1).get();
    if (!existing.empty) return existing.docs[0].id;

    const ref = await db.collection("media").add({
      url,
      filename: entry.filename || filenameFromUrl(url, "image.webp"),
      altHi: entry.altHi || "",
      altEn: entry.altEn || "",
      uploadedBy: entry.uploadedBy || "system",
      size: entry.size || 0,
      contentType: entry.contentType || "image/webp",
      source: entry.source || "upload",
      articleId: entry.articleId || null,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  } catch (err) {
    console.error("upsertMediaLibraryEntry failed:", err);
    return null;
  }
}

export async function getAggregatedMediaLibrary(limit = 300): Promise<MediaLibraryItem[]> {
  const db = getAdminDb();
  const byUrl = new Map<string, MediaLibraryItem>();

  const [mediaSnap, assetsSnap, newsSnap] = await Promise.all([
    db.collection("media").orderBy("createdAt", "desc").limit(limit).get().catch(async () => db.collection("media").limit(limit).get()),
    db.collection("mediaAssets").orderBy("createdAt", "desc").limit(limit).get().catch(async () => db.collection("mediaAssets").limit(limit).get()),
    db.collection("news").orderBy("publishedAt", "desc").limit(200).get().catch(async () => db.collection("news").limit(200).get()),
  ]);

  mediaSnap.docs.forEach((d) => {
    const data = d.data();
    const url = asString(data.url);
    if (!url) return;
    byUrl.set(url, {
      id: `upload:${d.id}`,
      url,
      filename: asString(data.filename) || filenameFromUrl(url, "upload"),
      altHi: asString(data.altHi),
      altEn: asString(data.altEn),
      uploadedBy: asString(data.uploadedBy || "admin"),
      size: Number(data.size || 0),
      contentType: asString(data.contentType || "image/*"),
      source: (asString(data.source) as MediaLibrarySource) || "upload",
      articleId: data.articleId ? asString(data.articleId) : undefined,
      createdAt: createdAtIso(data.createdAt),
      deletable: !asString(data.source) || asString(data.source) === "upload",
    });
  });

  assetsSnap.docs.forEach((d) => {
    const data = d.data();
    const url = asString(data.imageUrl);
    if (!url || byUrl.has(url)) return;
    byUrl.set(url, {
      id: `ai:${d.id}`,
      url,
      thumbnailUrl: asString(data.thumbnailUrl) || undefined,
      filename: asString(data.imageId) || filenameFromUrl(url, "ai-image"),
      altHi: asString(data.imageType || "AI image"),
      altEn: asString(data.imageType || "AI image"),
      uploadedBy: asString(data.createdBy || data.provider || "ai"),
      size: Number(data.size || 0),
      contentType: asString(data.format) ? `image/${data.format}` : "image/webp",
      source: "ai_media",
      articleId: data.articleId ? asString(data.articleId) : undefined,
      createdAt: createdAtIso(data.createdAt),
      deletable: false,
    });
  });

  newsSnap.docs.forEach((d) => {
    const data = d.data();
    const candidates = [
      asString(data.imageUrl),
      asString(data.imageLargeUrl),
      asString(data.imageMediumUrl),
    ].filter((u) => u && isHostedAsset(u) && !isLikelyFallback(u));

    // Prefer one unique primary image per article
    const url = candidates[0];
    if (!url || byUrl.has(url)) return;

    byUrl.set(url, {
      id: `news:${d.id}`,
      url,
      thumbnailUrl: asString(data.imageThumbnailUrl) || asString(data.imageMediumUrl) || undefined,
      filename: asString(data.slug) || asString(data.titleEn) || filenameFromUrl(url, "article"),
      altHi: asString(data.imageAltHi || data.titleHi),
      altEn: asString(data.imageAltEn || data.titleEn),
      uploadedBy: asString(data.imageOrigin || data.author || "article"),
      size: 0,
      contentType: "image/webp",
      source: "article_pipeline",
      articleId: d.id,
      createdAt: createdAtIso(data.publishedAt || data.updatedAt || data.createdAt),
      deletable: false,
    });
  });

  return [...byUrl.values()]
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, limit);
}
