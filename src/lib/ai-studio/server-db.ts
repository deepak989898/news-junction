import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_AI_SETTINGS, AI_SETTINGS_DOC_ID } from "./defaults";
import { AISettings, AIContentLog, AIPendingChange, AIPromptTemplate, AIUsageStats } from "./types";
import { estimateCost } from "./ai-client";

function tsToIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function getAISettings(): Promise<AISettings> {
  const doc = await getAdminDb().collection("settings").doc(AI_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_AI_SETTINGS };
  return { ...DEFAULT_AI_SETTINGS, ...doc.data() } as AISettings;
}

export async function getPromptTemplate(type: string): Promise<string | null> {
  const snap = await getAdminDb()
    .collection("aiPromptTemplates")
    .where("type", "==", type)
    .where("isActive", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data().prompt as string;
}

export async function getArticleById(articleId: string) {
  const doc = await getAdminDb().collection("news").doc(articleId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function logAIContent(entry: Omit<AIContentLog, "id">): Promise<string> {
  const ref = await getAdminDb().collection("aiContentLogs").add({
    ...entry,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getUsageStats(): Promise<AIUsageStats> {
  const settings = await getAISettings();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const snap = await getAdminDb()
    .collection("aiContentLogs")
    .where("createdAt", ">=", monthStart)
    .get();

  let dailyTokens = 0;
  let monthlyTokens = 0;
  let dailyCost = 0;
  let monthlyCost = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    const tokens = (data.tokensUsed as number) || 0;
    const cost = (data.estimatedCost as number) || 0;
    monthlyTokens += tokens;
    monthlyCost += cost;
    if ((data.createdAt as string) >= dayStart) {
      dailyTokens += tokens;
      dailyCost += cost;
    }
  });

  const limitExceeded =
    dailyTokens >= settings.dailyTokenLimit || monthlyCost >= settings.monthlyCostLimit;

  return {
    dailyTokens,
    monthlyTokens,
    dailyCost,
    monthlyCost,
    dailyLimit: settings.dailyTokenLimit,
    monthlyLimit: settings.monthlyCostLimit,
    limitExceeded,
  };
}

export async function checkCostLimits(): Promise<{ allowed: boolean; message?: string }> {
  const stats = await getUsageStats();
  if (stats.limitExceeded) {
    return {
      allowed: false,
      message: "Daily token or monthly cost limit exceeded. AI calls are paused.",
    };
  }
  return { allowed: true };
}

export async function createPendingChange(
  data: Omit<AIPendingChange, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await getAdminDb().collection("aiPendingChanges").add({
    ...data,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function applyArticleField(
  articleId: string,
  field: string,
  value: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const update: Record<string, unknown> = {
    [field]: value,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  await getAdminDb().collection("news").doc(articleId).update(update);
}

export async function applyArticleFields(
  articleId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await getAdminDb()
    .collection("news")
    .doc(articleId)
    .update({ ...fields, updatedAt: new Date().toISOString() });
}

export async function getRecentLogs(limit = 20): Promise<AIContentLog[]> {
  const snap = await getAdminDb()
    .collection("aiContentLogs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AIContentLog, "id">),
    createdAt: tsToIso(d.data().createdAt),
  }));
}

export async function getPendingChanges(limit = 20): Promise<AIPendingChange[]> {
  const snap = await getAdminDb()
    .collection("aiPendingChanges")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AIPendingChange, "id">),
    createdAt: tsToIso(d.data().createdAt),
    updatedAt: tsToIso(d.data().updatedAt),
  }));
}

export async function seedDefaultTemplatesIfEmpty(): Promise<void> {
  const snap = await getAdminDb().collection("aiPromptTemplates").limit(1).get();
  if (!snap.empty) return;

  const { DEFAULT_PROMPT_TEMPLATES } = await import("./defaults");
  const batch = getAdminDb().batch();
  const now = new Date().toISOString();
  DEFAULT_PROMPT_TEMPLATES.forEach((t) => {
    const ref = getAdminDb().collection("aiPromptTemplates").doc();
    batch.set(ref, { ...t, createdAt: now, updatedAt: now });
  });
  await batch.commit();
}

export function calcEstimatedCost(provider: AISettings["provider"], tokens: number): number {
  return Math.round(estimateCost(provider, tokens) * 10000) / 10000;
}
