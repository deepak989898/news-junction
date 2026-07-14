import { getAdminDb } from "@/lib/firebase-admin";
import { analyzeArticleSubject } from "./analysis";
import { isLogoFallback } from "./fallbacks";
import { ImagePipelineInput } from "./types";

export type ImageAuditClassification =
  | "correct"
  | "generic"
  | "low_quality"
  | "unrelated"
  | "real_person_mismatch_risk"
  | "missing"
  | "logo_fallback"
  | "copyright_unknown";

export interface ImageAuditItem {
  newsId: string;
  titleHi: string;
  titleEn: string;
  imageUrl: string;
  categoryId: string;
  views: number;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt: string | null;
  classification: ImageAuditClassification;
  imageOrigin?: string;
  imageQualityScore?: number;
  imageRelevanceScore?: number;
  isRealPersonPrimary: boolean;
  priority: number;
  reasons: string[];
}

function computePriority(item: Omit<ImageAuditItem, "priority">): number {
  let score = 0;
  if (item.isFeatured) score += 100;
  if (item.isTrending) score += 80;
  score += Math.min(item.views, 500);
  if (item.classification === "logo_fallback") score += 60;
  if (item.classification === "real_person_mismatch_risk") score += 90;
  if (item.classification === "unrelated") score += 70;
  if (item.classification === "missing") score += 50;
  if (item.publishedAt) {
    const age = Date.now() - new Date(item.publishedAt).getTime();
    if (age < 7 * 86400000) score += 40;
  }
  return score;
}

export function classifyArticleImage(data: Record<string, unknown>): {
  classification: ImageAuditClassification;
  isRealPersonPrimary: boolean;
  reasons: string[];
} {
  const imageUrl = String(data.imageUrl || "");
  const reasons: string[] = [];

  if (!imageUrl) {
    return { classification: "missing", isRealPersonPrimary: false, reasons: ["No image URL"] };
  }

  if (isLogoFallback(imageUrl)) {
    return { classification: "logo_fallback", isRealPersonPrimary: false, reasons: ["Using logo fallback"] };
  }

  const input: ImagePipelineInput = {
    articleId: String(data.id || ""),
    rawNewsId: String(data.automationRawNewsId || ""),
    titleHi: String(data.titleHi || ""),
    titleEn: String(data.titleEn || ""),
    summaryHi: String(data.summaryHi || ""),
    summaryEn: String(data.summaryEn || ""),
    categoryId: String(data.categoryId || "desh"),
    categoryNameEn: String(data.categoryNameEn || "India"),
    categoryNameHi: String(data.categoryNameHi || "देश"),
    sourceName: String(data.sourceName || ""),
    sourceUrl: String(data.sourceUrl || ""),
    originalLink: String(data.sourceUrl || ""),
    originalImage: "",
  };

  const analysis = analyzeArticleSubject(input);
  const quality = Number(data.imageQualityScore || 0);
  const relevance = Number(data.imageRelevanceScore || 0);
  const origin = String(data.imageOrigin || "");

  if (analysis.isRealPersonPrimary && origin === "openai") {
    // OpenAI editorial portraits are allowed — flag only for manual review notes, not as hard mismatch.
    reasons.push("Real-person article uses AI editorial portrait — review likeness quality");
  }

  if (analysis.isRealPersonPrimary && (origin === "fallback" || isLogoFallback(imageUrl))) {
    reasons.push("Real-person article without licensed/AI image");
    return { classification: "real_person_mismatch_risk", isRealPersonPrimary: true, reasons };
  }

  if (quality > 0 && quality < 70) {
    reasons.push(`Low quality score: ${quality}`);
    return { classification: "low_quality", isRealPersonPrimary: analysis.isRealPersonPrimary, reasons };
  }

  if (relevance > 0 && relevance < 75) {
    reasons.push(`Low relevance score: ${relevance}`);
    return { classification: "unrelated", isRealPersonPrimary: analysis.isRealPersonPrimary, reasons };
  }

  if (!origin && !data.imageLicence) {
    reasons.push("Image origin/licence not recorded");
    return { classification: "copyright_unknown", isRealPersonPrimary: analysis.isRealPersonPrimary, reasons };
  }

  if (origin === "fallback") {
    reasons.push("Category fallback image");
    return { classification: "generic", isRealPersonPrimary: analysis.isRealPersonPrimary, reasons };
  }

  if (analysis.isRealPersonPrimary && origin === "openai") {
    return { classification: "correct", isRealPersonPrimary: true, reasons: reasons.length ? reasons : ["AI portrait present"] };
  }

  return { classification: "correct", isRealPersonPrimary: analysis.isRealPersonPrimary, reasons: ["Meets basic criteria"] };
}

export async function auditPublishedArticleImages(limit = 500): Promise<{
  items: ImageAuditItem[];
  summary: Record<ImageAuditClassification, number>;
  total: number;
}> {
  const db = getAdminDb();
  let snap;
  try {
    snap = await db
      .collection("news")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(limit)
      .get();
  } catch {
    // Fallback if composite index/query fails.
    snap = await db.collection("news").where("status", "==", "published").limit(limit).get();
  }

  const summary: Record<ImageAuditClassification, number> = {
    correct: 0,
    generic: 0,
    low_quality: 0,
    unrelated: 0,
    real_person_mismatch_risk: 0,
    missing: 0,
    logo_fallback: 0,
    copyright_unknown: 0,
  };

  const items: ImageAuditItem[] = snap.docs.map((doc) => {
    const data = doc.data();
    const { classification, isRealPersonPrimary, reasons } = classifyArticleImage({
      ...data,
      id: doc.id,
    });

    summary[classification] += 1;

    const base: Omit<ImageAuditItem, "priority"> = {
      newsId: doc.id,
      titleHi: String(data.titleHi || ""),
      titleEn: String(data.titleEn || ""),
      imageUrl: String(data.imageUrl || ""),
      categoryId: String(data.categoryId || ""),
      views: Number(data.views || 0),
      isFeatured: Boolean(data.isFeatured),
      isTrending: Boolean(data.isTrending),
      publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || data.publishedAt || null,
      classification,
      imageOrigin: data.imageOrigin as string | undefined,
      imageQualityScore: data.imageQualityScore as number | undefined,
      imageRelevanceScore: data.imageRelevanceScore as number | undefined,
      isRealPersonPrimary,
      reasons,
    };

    return { ...base, priority: computePriority(base) };
  });

  items.sort((a, b) => b.priority - a.priority);

  return { items, summary, total: items.length };
}

export async function saveImageAuditQueue(items: ImageAuditItem[]) {
  const db = getAdminDb();
  const batch = db.batch();
  const reviewItems = items.filter((i) => i.classification !== "correct");

  for (const item of reviewItems.slice(0, 100)) {
    const ref = db.collection("imageAuditQueue").doc(item.newsId);
    batch.set(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
}
