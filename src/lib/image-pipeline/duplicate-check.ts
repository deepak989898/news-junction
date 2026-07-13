import { getAdminDb } from "@/lib/firebase-admin";

export async function isDuplicateImageHash(
  fileHash: string,
  excludeArticleId?: string
): Promise<{ duplicate: boolean; existingNewsId?: string }> {
  if (!fileHash) return { duplicate: false };

  const db = getAdminDb();
  const snap = await db
    .collection("news")
    .where("imageFileHash", "==", fileHash)
    .limit(3)
    .get();

  for (const doc of snap.docs) {
    if (excludeArticleId && doc.id === excludeArticleId) continue;
    return { duplicate: true, existingNewsId: doc.id };
  }

  return { duplicate: false };
}

export async function isDuplicateSourceUrl(
  originalImageUrl: string,
  excludeArticleId?: string
): Promise<boolean> {
  if (!originalImageUrl) return false;

  const db = getAdminDb();
  const snap = await db
    .collection("news")
    .where("imageOriginalUrl", "==", originalImageUrl)
    .limit(2)
    .get();

  return snap.docs.some((d) => d.id !== excludeArticleId);
}
