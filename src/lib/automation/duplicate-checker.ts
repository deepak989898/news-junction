import { getAdminDb } from "@/lib/firebase-admin";
import { titleSimilarity } from "./similarity";
import slugify from "slugify";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateScore: number;
  reason?: string;
}

export async function checkDuplicate(
  originalLink: string,
  originalTitle: string,
  threshold: number,
  excludeRawNewsId?: string
): Promise<DuplicateCheckResult> {
  const db = getAdminDb();

  if (originalLink) {
    const linkSnap = await db
      .collection("rawNews")
      .where("originalLink", "==", originalLink)
      .limit(5)
      .get();
    const hasOther = linkSnap.docs.some((doc) => doc.id !== excludeRawNewsId);
    if (hasOther) {
      return { isDuplicate: true, duplicateScore: 1, reason: "Same original link exists in rawNews" };
    }
  }

  const recentRaw = await db
    .collection("rawNews")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  let maxScore = 0;
  for (const doc of recentRaw.docs) {
    if (excludeRawNewsId && doc.id === excludeRawNewsId) continue;
    const data = doc.data();
    const score = titleSimilarity(originalTitle, data.originalTitle || "");
    if (score > maxScore) maxScore = score;
    if (score >= threshold) {
      return {
        isDuplicate: true,
        duplicateScore: score,
        reason: "Similar title found in rawNews",
      };
    }
  }

  const slug = slugify(originalTitle, { lower: true, strict: true });
  const newsSlugSnap = await db
    .collection("news")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (!newsSlugSnap.empty) {
    return { isDuplicate: true, duplicateScore: 0.9, reason: "Similar slug exists in news" };
  }

  const recentNews = await db
    .collection("news")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  for (const doc of recentNews.docs) {
    const data = doc.data();
    const hiScore = titleSimilarity(originalTitle, data.titleHi || "");
    const enScore = titleSimilarity(originalTitle, data.titleEn || "");
    const score = Math.max(hiScore, enScore);
    if (score > maxScore) maxScore = score;
    if (score >= threshold) {
      return {
        isDuplicate: true,
        duplicateScore: score,
        reason: "Similar title found in published news",
      };
    }
  }

  return { isDuplicate: false, duplicateScore: maxScore };
}
