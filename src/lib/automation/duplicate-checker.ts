import { getAdminDb } from "@/lib/firebase-admin";
import { titleSimilarity } from "./similarity";
import slugify from "slugify";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateScore: number;
  reason?: string;
  /** True when we already ingested this external URL into the raw queue (not a published-site duplicate). */
  alreadyQueued?: boolean;
}

/**
 * Duplicate = this story is already on News Junction (published/draft news).
 * External sites having the same story is NOT a duplicate — we rewrite + republish with our own content/image.
 */
export async function checkDuplicate(
  originalLink: string,
  originalTitle: string,
  threshold: number,
  _excludeRawNewsId?: string
): Promise<DuplicateCheckResult> {
  const db = getAdminDb();
  let maxScore = 0;

  // 1) Exact original link already published (or sitting as draft) on our site
  if (originalLink) {
    const bySourceUrl = await db
      .collection("news")
      .where("sourceUrl", "==", originalLink)
      .limit(5)
      .get();

    const onSite = bySourceUrl.docs.find((doc) => {
      const status = String(doc.data().status || "");
      return status === "published" || status === "draft" || status === "pendingApproval";
    });

    if (onSite) {
      return {
        isDuplicate: true,
        duplicateScore: 1,
        reason: "Same article already exists on News Junction (matching source URL)",
      };
    }
  }

  // 2) Same slug as an existing News Junction article
  const slug = slugify(originalTitle || "", { lower: true, strict: true });
  if (slug.length >= 8) {
    const newsSlugSnap = await db.collection("news").where("slug", "==", slug).limit(3).get();
    const slugHit = newsSlugSnap.docs.find((doc) => {
      const status = String(doc.data().status || "");
      return status === "published" || status === "draft";
    });
    if (slugHit) {
      return {
        isDuplicate: true,
        duplicateScore: 0.95,
        reason: "Same article already published on News Junction (matching slug)",
      };
    }
  }

  // 3) Similar title only against OUR published/draft news — not against other sites / raw queue
  let recentNews;
  try {
    recentNews = await db
      .collection("news")
      .orderBy("publishedAt", "desc")
      .limit(100)
      .get();
  } catch {
    recentNews = await db.collection("news").orderBy("createdAt", "desc").limit(100).get();
  }

  for (const doc of recentNews.docs) {
    const data = doc.data();
    const status = String(data.status || "");
    if (status !== "published" && status !== "draft") continue;

    const hiScore = titleSimilarity(originalTitle, String(data.titleHi || ""));
    const enScore = titleSimilarity(originalTitle, String(data.titleEn || ""));
    const score = Math.max(hiScore, enScore);
    if (score > maxScore) maxScore = score;
    if (score >= threshold) {
      return {
        isDuplicate: true,
        duplicateScore: score,
        reason: "Same/similar article already published on News Junction",
      };
    }
  }

  return { isDuplicate: false, duplicateScore: maxScore };
}

/** Same external URL already sitting in our fetch/process queue — skip creating another row. */
export async function isAlreadyQueuedExternalLink(
  originalLink: string,
  excludeRawNewsId?: string
): Promise<boolean> {
  if (!originalLink) return false;
  const snap = await getAdminDb()
    .collection("rawNews")
    .where("originalLink", "==", originalLink)
    .limit(8)
    .get();

  return snap.docs.some((doc) => {
    if (excludeRawNewsId && doc.id === excludeRawNewsId) return false;
    const status = String(doc.data().status || "");
    // Ignore old discarded duplicate/failed noise for allow-reprocessing; but prevent spam when fetched/processing/published
    return ["fetched", "processing", "pendingApproval", "approved", "published"].includes(status);
  });
}
