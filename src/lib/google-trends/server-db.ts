import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_GOOGLE_TRENDS_SETTINGS,
  GOOGLE_TRENDS_SETTINGS_DOC_ID,
} from "./defaults";
import {
  GoogleTrendsSettings,
  TrendAutomationLog,
  TrendSourceCandidate,
  TrendTopic,
} from "./types";

const COLLECTIONS = {
  trendTopics: "trendTopics",
  trendSourceCandidates: "trendSourceCandidates",
  trendAutomationLogs: "trendAutomationLogs",
  settings: "settings",
} as const;

function tsToIso(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

export async function getGoogleTrendsSettings(): Promise<GoogleTrendsSettings> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.settings).doc(GOOGLE_TRENDS_SETTINGS_DOC_ID).get();
  const officialApiConfigured = Boolean(
    process.env.GOOGLE_TRENDS_API_KEY && process.env.GOOGLE_TRENDS_API_ENABLED === "true"
  );
  if (!doc.exists) {
    return { ...DEFAULT_GOOGLE_TRENDS_SETTINGS, officialApiConfigured };
  }
  const data = doc.data()!;
  return {
    ...DEFAULT_GOOGLE_TRENDS_SETTINGS,
    ...data,
    officialApiConfigured,
    lastFetchRun: data.lastFetchRun?.toDate?.()?.toISOString() || data.lastFetchRun || null,
    lastResearchRun: data.lastResearchRun?.toDate?.()?.toISOString() || data.lastResearchRun || null,
    lastProcessRun: data.lastProcessRun?.toDate?.()?.toISOString() || data.lastProcessRun || null,
    lastPublishRun: data.lastPublishRun?.toDate?.()?.toISOString() || data.lastPublishRun || null,
  };
}

export async function updateGoogleTrendsSettings(partial: Partial<GoogleTrendsSettings>) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.settings).doc(GOOGLE_TRENDS_SETTINGS_DOC_ID).set(
    { ...partial, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function logTrendAutomation(entry: Omit<TrendAutomationLog, "id" | "createdAt">) {
  try {
    const db = getAdminDb();
    await db.collection(COLLECTIONS.trendAutomationLogs).add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // non-blocking
  }
}

function mapTrendTopic(id: string, data: FirebaseFirestore.DocumentData): TrendTopic {
  return {
    id,
    trendId: data.trendId || id,
    title: data.title || "",
    normalizedTitle: data.normalizedTitle || "",
    relatedQueries: data.relatedQueries || [],
    searchVolume: Number(data.searchVolume || 0),
    growthPercentage: Number(data.growthPercentage || 0),
    trendStatus: data.trendStatus || "unknown",
    startedAt: data.startedAt || null,
    endedAt: data.endedAt || null,
    category: data.category || "All",
    mappedCategoryId: data.mappedCategoryId || "desh",
    country: data.country || "IN",
    sourceType: data.sourceType || "googleTrendsRss",
    sourceUrl: data.sourceUrl || "",
    fetchedAt: data.fetchedAt || null,
    status: data.status || "fetched",
    riskLevel: data.riskLevel || "medium",
    duplicateScore: Number(data.duplicateScore || 0),
    duplicateReason: data.duplicateReason,
    priorityScore: Number(data.priorityScore || 0),
    articleId: data.articleId,
    aiOutput: data.aiOutput || null,
    imageUrl: data.imageUrl,
    verificationNotes: data.verificationNotes,
    errorMessage: data.errorMessage,
    isTestRecord: Boolean(data.isTestRecord),
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function createTrendTopic(data: Omit<TrendTopic, "id" | "createdAt" | "updatedAt">) {
  const db = getAdminDb();
  const ref = await db.collection(COLLECTIONS.trendTopics).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateTrendTopic(id: string, data: Record<string, unknown>) {
  const db = getAdminDb();
  await db.collection(COLLECTIONS.trendTopics).doc(id).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getTrendTopicById(id: string): Promise<TrendTopic | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTIONS.trendTopics).doc(id).get();
  if (!doc.exists) return null;
  return mapTrendTopic(doc.id, doc.data()!);
}

export async function getTrendTopicsByStatus(status: string, limit = 20): Promise<TrendTopic[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.trendTopics)
    .where("status", "==", status)
    .limit(limit * 3)
    .get();
  return snap.docs
    .map((d) => mapTrendTopic(d.id, d.data()))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

export async function getRecentTrendTopics(limit = 100): Promise<TrendTopic[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.trendTopics)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapTrendTopic(d.id, d.data()));
}

export async function findTrendByNormalizedTitle(normalizedTitle: string): Promise<TrendTopic | null> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.trendTopics)
    .where("normalizedTitle", "==", normalizedTitle)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return mapTrendTopic(snap.docs[0].id, snap.docs[0].data());
}

export async function saveTrendSourceCandidates(
  trendId: string,
  candidates: Omit<TrendSourceCandidate, "id" | "createdAt">[]
) {
  const db = getAdminDb();
  const batch = db.batch();
  const existing = await db
    .collection(COLLECTIONS.trendSourceCandidates)
    .where("trendId", "==", trendId)
    .get();
  existing.docs.forEach((d) => batch.delete(d.ref));

  for (const c of candidates) {
    const ref = db.collection(COLLECTIONS.trendSourceCandidates).doc();
    batch.set(ref, { ...c, createdAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

export async function getTrendSourceCandidates(trendId: string): Promise<TrendSourceCandidate[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.trendSourceCandidates)
    .where("trendId", "==", trendId)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      trendId: data.trendId,
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      sourceType: data.sourceType,
      title: data.title,
      summary: data.summary,
      publishedAt: data.publishedAt || null,
      trustLevel: data.trustLevel || "medium",
      matchScore: Number(data.matchScore || 0),
      selected: Boolean(data.selected),
      rejectionReason: data.rejectionReason,
      createdAt: tsToIso(data.createdAt),
    };
  });
}

export async function countTrendArticlesPublishedToday(): Promise<{ total: number; byCategory: Record<string, number> }> {
  const db = getAdminDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const snap = await db
    .collection(COLLECTIONS.trendTopics)
    .where("status", "==", "published")
    .limit(200)
    .get();

  const byCategory: Record<string, number> = {};
  let total = 0;
  snap.docs.forEach((d) => {
    const updated = d.data().updatedAt?.toDate?.();
    if (updated && updated >= start) {
      total += 1;
      const cat = String(d.data().mappedCategoryId || "desh");
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
  });
  return { total, byCategory };
}

export async function getTrendAutomationLogs(limit = 50): Promise<TrendAutomationLog[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.trendAutomationLogs)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      message: data.message,
      trendId: data.trendId,
      category: data.category,
      status: data.status,
      estimatedCost: data.estimatedCost,
      createdAt: tsToIso(data.createdAt),
    };
  });
}
