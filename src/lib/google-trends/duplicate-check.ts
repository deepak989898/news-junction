import { getAdminDb } from "@/lib/firebase-admin";
import { titleSimilarity } from "@/lib/automation/similarity";
import slugify from "slugify";

export interface TrendDuplicateResult {
  isDuplicate: boolean;
  duplicateScore: number;
  reason?: string;
}

export type TrendDuplicateMode = "exact" | "full";

/**
 * Duplicate checks for Google Trends.
 * - exact: only same normalizedTitle in trendTopics (used on fetch so discovery fills the table)
 * - full: also compares against recent news / rawNews (used later if needed)
 */
export async function checkTrendDuplicate(
  title: string,
  normalizedTitle: string,
  threshold = 0.72,
  excludeTrendId?: string,
  mode: TrendDuplicateMode = "exact"
): Promise<TrendDuplicateResult> {
  const db = getAdminDb();

  try {
    const existing = await db
      .collection("trendTopics")
      .where("normalizedTitle", "==", normalizedTitle)
      .limit(3)
      .get();

    for (const doc of existing.docs) {
      if (excludeTrendId && doc.id === excludeTrendId) continue;
      return {
        isDuplicate: true,
        duplicateScore: 1,
        reason: "Same normalized trend title already exists",
      };
    }
  } catch {
    // Continue with softer checks if query fails.
  }

  if (mode === "exact") {
    return { isDuplicate: false, duplicateScore: 0 };
  }

  let maxScore = 0;

  try {
    const recentTrends = await db.collection("trendTopics").orderBy("createdAt", "desc").limit(80).get();
    for (const doc of recentTrends.docs) {
      if (excludeTrendId && doc.id === excludeTrendId) continue;
      const data = doc.data();
      const score = titleSimilarity(title, data.title || "");
      maxScore = Math.max(maxScore, score);
      if (score >= threshold) {
        return {
          isDuplicate: true,
          duplicateScore: score,
          reason: "Similar trend title in trendTopics",
        };
      }
    }
  } catch {
    // Missing index / empty collection — don't block saving trends.
  }

  try {
    const recentRaw = await db.collection("rawNews").orderBy("createdAt", "desc").limit(60).get();
    for (const doc of recentRaw.docs) {
      const data = doc.data();
      const score = titleSimilarity(title, data.originalTitle || "");
      maxScore = Math.max(maxScore, score);
      if (score >= threshold) {
        return {
          isDuplicate: true,
          duplicateScore: score,
          reason: "Similar title in RSS automation queue",
        };
      }
    }
  } catch {
    // ignore
  }

  try {
    const recentNews = await db.collection("news").orderBy("createdAt", "desc").limit(40).get();
    for (const doc of recentNews.docs) {
      const data = doc.data();
      const hi = titleSimilarity(title, data.titleHi || "");
      const en = titleSimilarity(title, data.titleEn || "");
      const score = Math.max(hi, en);
      maxScore = Math.max(maxScore, score);
      if (score >= threshold) {
        return {
          isDuplicate: true,
          duplicateScore: score,
          reason: "Similar published article already exists",
        };
      }
    }
  } catch {
    // ignore
  }

  try {
    const slug = slugify(title, { lower: true, strict: true });
    if (slug) {
      const slugSnap = await db.collection("news").where("slug", "==", slug).limit(1).get();
      if (!slugSnap.empty) {
        return { isDuplicate: true, duplicateScore: 0.9, reason: "Matching article slug exists" };
      }
    }
  } catch {
    // ignore
  }

  return { isDuplicate: false, duplicateScore: maxScore };
}
