import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  AutomationSettings,
  AutomationLog,
  AutomationStats,
  RawNewsItem,
  RawNewsStatus,
  AIGeneratedContent,
} from "@/lib/automation/types";
import { DEFAULT_AUTOMATION_SETTINGS as DEFAULTS, AUTOMATION_SETTINGS_DOC_ID } from "@/lib/automation/defaults";
import slugify from "slugify";

const COLLECTIONS = {
  rawNews: "rawNews",
  automationLogs: "automationLogs",
  settings: "settings",
  sources: "sources",
  news: "news",
  categories: "categories",
} as const;

function tsToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

function mapRawNews(id: string, data: FirebaseFirestore.DocumentData): RawNewsItem {
  return {
    id,
    sourceId: data.sourceId || "",
    sourceName: data.sourceName || "",
    sourceUrl: data.sourceUrl || "",
    sourceType: data.sourceType || "",
    originalTitle: data.originalTitle || "",
    originalLink: data.originalLink || "",
    originalSummary: data.originalSummary || "",
    originalImage: data.originalImage || "",
    originalPublishedAt: data.originalPublishedAt || null,
    language: data.language || "Both",
    categoryId: data.categoryId || "desh",
    status: data.status || "fetched",
    riskLevel: data.riskLevel || "medium",
    duplicateScore: data.duplicateScore || 0,
    aiOutput: data.aiOutput || null,
    generatedImageUrl: data.generatedImageUrl || undefined,
    newsId: data.newsId || undefined,
    errorMessage: data.errorMessage || undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.settings).doc(AUTOMATION_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULTS };
  const data = doc.data()!;
  return {
    ...DEFAULTS,
    ...data,
    lastFetchRun: data.lastFetchRun?.toDate?.()?.toISOString() || data.lastFetchRun || null,
    lastProcessRun: data.lastProcessRun?.toDate?.()?.toISOString() || data.lastProcessRun || null,
    lastCleanupRun: data.lastCleanupRun?.toDate?.()?.toISOString() || data.lastCleanupRun || null,
  };
}

export async function updateAutomationSettings(settings: Partial<AutomationSettings>) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.settings).doc(AUTOMATION_SETTINGS_DOC_ID).set(
    { ...settings, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function logAutomation(entry: Omit<AutomationLog, "id" | "createdAt">) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.automationLogs).add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getActiveSources(): Promise<Array<Record<string, unknown> & { id: string }>> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.sources).where("isActive", "==", true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createRawNewsItem(data: {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  originalTitle: string;
  originalLink: string;
  originalSummary: string;
  originalImage: string;
  originalPublishedAt: string | null;
  language: string;
  categoryId: string;
  status?: RawNewsStatus;
  riskLevel?: string;
  duplicateScore?: number;
}) {
  const db = getAdminDb();
  const ref = await db.collection(COLLECTIONS.rawNews).add({
    ...data,
    status: data.status || "fetched",
    riskLevel: data.riskLevel || "medium",
    duplicateScore: data.duplicateScore || 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateRawNews(id: string, data: Record<string, unknown>) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.rawNews).doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteRawNewsItems(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const db = getAdminDb();
  const batch = db.batch();
  ids.forEach((id) => batch.delete(db.collection(COLLECTIONS.rawNews).doc(id)));
  await batch.commit();
  return ids.length;
}

export async function getRawNewsByStatus(status: RawNewsStatus, limit = 10) {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.rawNews)
    .where("status", "==", status)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapRawNews(d.id, d.data()));
}

export async function countRawNewsByStatus(status: RawNewsStatus): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.rawNews).where("status", "==", status).count().get();
  return snap.data().count || 0;
}

export async function getAllRawNews(limit = 100) {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.rawNews)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapRawNews(d.id, d.data()));
}

export async function getRawNewsById(id: string) {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.rawNews).doc(id).get();
  if (!doc.exists) return null;
  return mapRawNews(doc.id, doc.data()!);
}

export async function getCategoryById(categoryId: string) {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.categories).doc(categoryId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function countPublishedToday(): Promise<{ total: number; byCategory: Record<string, number> }> {
  const db = getAdminDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const snap = await db
    .collection(COLLECTIONS.news)
    .where("publishedAt", ">=", Timestamp.fromDate(startOfDay))
    .get();

  const byCategory: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const cat = d.data().categoryId || "unknown";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  return { total: snap.size, byCategory };
}

export async function getAutomationStats(): Promise<AutomationStats> {
  const db = getAdminDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = Timestamp.fromDate(startOfDay);

  const [rawToday, pending, failed, duplicates, settings] = await Promise.all([
    db.collection(COLLECTIONS.rawNews).where("createdAt", ">=", startTs).get(),
    db.collection(COLLECTIONS.rawNews).where("status", "==", "pendingApproval").get(),
    db.collection(COLLECTIONS.rawNews).where("status", "==", "failed").get(),
    db.collection(COLLECTIONS.rawNews).where("status", "==", "duplicate").get(),
    getAutomationSettings(),
  ]);

  let fetchedToday = 0;
  let processedToday = 0;
  let publishedToday = 0;

  rawToday.docs.forEach((d) => {
    fetchedToday++;
    const status = d.data().status;
    if (["pendingApproval", "approved", "published", "processing"].includes(status)) {
      processedToday++;
    }
    if (status === "published") publishedToday++;
  });

  return {
    fetchedToday,
    processedToday,
    publishedToday,
    pendingApproval: pending.size,
    failed: failed.size,
    duplicates: duplicates.size,
    lastFetchRun: settings.lastFetchRun,
    lastProcessRun: settings.lastProcessRun,
  };
}

export async function getRecentAutomationLogs(limit = 20) {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.automationLogs)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      message: data.message,
      sourceId: data.sourceId,
      rawNewsId: data.rawNewsId,
      newsId: data.newsId,
      status: data.status,
      createdAt: tsToIso(data.createdAt),
    } as AutomationLog;
  });
}

export async function publishRawNewsToNews(
  rawNewsId: string,
  aiOutput: AIGeneratedContent,
  meta: {
    sourceName: string;
    sourceUrl: string;
    originalLink: string;
    categoryId: string;
    categoryNameHi: string;
    categoryNameEn: string;
    imageUrl: string;
    author: string;
    publish?: boolean;
    imageMetadata?: import("@/lib/image-pipeline/types").ArticleImageMetadata;
    geoFields?: Record<string, unknown>;
  }
): Promise<string> {
  const db = getAdminDb();
  const slug = slugify(aiOutput.titleEn || aiOutput.titleHi, { lower: true, strict: true });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newsjunction.vercel.app";
  const status = meta.publish !== false ? "published" : "draft";

  const newsData = {
    titleHi: aiOutput.titleHi,
    titleEn: aiOutput.titleEn,
    slug,
    summaryHi: aiOutput.summaryHi,
    summaryEn: aiOutput.summaryEn,
    contentHi: aiOutput.contentHi,
    contentEn: aiOutput.contentEn,
    categoryId: meta.categoryId,
    categoryNameHi: meta.categoryNameHi,
    categoryNameEn: meta.categoryNameEn,
    imageUrl: meta.imageUrl,
    imageAltHi: aiOutput.imageAltHi,
    imageAltEn: aiOutput.imageAltEn,
    author: meta.author,
    sourceName: meta.sourceName,
    sourceUrl: meta.originalLink || meta.sourceUrl,
    tags: aiOutput.tags,
    language: "hi",
    status,
    isBreaking: false,
    isFeatured: false,
    isTrending: false,
    views: 0,
    seoTitle: aiOutput.seoTitleHi,
    seoDescription: aiOutput.seoDescriptionHi,
    canonicalUrl: `${siteUrl}/article/${slug}`,
    isAutomated: true,
    sourceCreditText: aiOutput.sourceCreditText,
    factCheckNotes: aiOutput.factCheckNotes,
    automationRawNewsId: rawNewsId,
    ...(meta.geoFields || {}),
    ...(meta.imageMetadata
      ? Object.fromEntries(
          Object.entries(meta.imageMetadata).filter(
            ([k, v]) => k !== "imageUrl" && k !== "imageAltHi" && k !== "imageAltEn" && v !== undefined
          )
        )
      : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: status === "published" ? FieldValue.serverTimestamp() : null,
  };

  const ref = await db.collection(COLLECTIONS.news).add(newsData);

  await updateRawNews(rawNewsId, {
    status: status === "published" ? "published" : "approved",
    newsId: ref.id,
    aiOutput,
  });

  return ref.id;
}

export async function cleanupOldRawNews(daysOld = 30) {
  const db = getAdminDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const cutoffTs = Timestamp.fromDate(cutoff);

  const snap = await db
    .collection(COLLECTIONS.rawNews)
    .where("status", "in", ["duplicate", "failed", "rejected"])
    .where("createdAt", "<", cutoffTs)
    .limit(100)
    .get();

  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}
