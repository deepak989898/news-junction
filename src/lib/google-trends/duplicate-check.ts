import { getAdminDb } from "@/lib/firebase-admin";
import { titleSimilarity } from "@/lib/automation/similarity";
import slugify from "slugify";
import { normalizeTrendTitle } from "./rss-fetcher";

export interface TrendDuplicateResult {
  isDuplicate: boolean;
  duplicateScore: number;
  reason?: string;
}

export async function checkTrendDuplicate(
  title: string,
  normalizedTitle: string,
  threshold = 0.72,
  excludeTrendId?: string
): Promise<TrendDuplicateResult> {
  const db = getAdminDb();

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

  const recentTrends = await db
    .collection("trendTopics")
    .orderBy("createdAt", "desc")
    .limit(80)
    .get();

  let maxScore = 0;
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

  const slug = slugify(title, { lower: true, strict: true });
  const slugSnap = await db.collection("news").where("slug", "==", slug).limit(1).get();
  if (!slugSnap.empty) {
    return { isDuplicate: true, duplicateScore: 0.9, reason: "Matching article slug exists" };
  }

  const normVariants = [
    normalizedTitle,
    normalizeTrendTitle(title.replace(/\s+/g, "")),
  ];
  for (const variant of normVariants) {
    if (!variant) continue;
    const variantSnap = await db
      .collection("trendTopics")
      .where("normalizedTitle", "==", variant)
      .limit(1)
      .get();
    if (!variantSnap.empty && variantSnap.docs[0].id !== excludeTrendId) {
      return { isDuplicate: true, duplicateScore: 0.95, reason: "Transliteration variant duplicate" };
    }
  }

  return { isDuplicate: false, duplicateScore: maxScore };
}
