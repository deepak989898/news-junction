import { getAdminDb } from "@/lib/firebase-admin";
import { callAI } from "@/lib/ai-studio/ai-client";
import { getAISettings } from "@/lib/ai-studio/server-db";
import { generateRecommendations, getDigests, getReadingHistory } from "@/lib/personalization/service";

function nowIso() {
  return new Date().toISOString();
}

type ChatDoc = {
  uid: string;
  title: string;
  prompt: string;
  response: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

function compactNewsContext(items: Record<string, unknown>[]) {
  return items
    .slice(0, 20)
    .map((n) => `- ${(n.titleEn as string) || (n.titleHi as string) || "Untitled"} (${(n.categoryNameEn as string) || (n.categoryNameHi as string) || "News"})`)
    .join("\n");
}

export async function generateUserAiText(args: {
  mode: "summary" | "bullet_summary" | "key_takeaways" | "explain_simple" | "explain_detailed" | "translate_hi" | "translate_en" | "brief_60" | "brief_5m";
  text: string;
  language?: "hi" | "en";
}) {
  const settings = await getAISettings();
  const userLang = args.language || "en";

  const systemPrompt =
    "You are News Junction AI assistant. Be factual, concise, safe, and avoid hallucinations. If unsure, say uncertainty clearly.";

  const promptByMode: Record<typeof args.mode, string> = {
    summary: `Summarize this news text in one short paragraph in ${userLang}.`,
    bullet_summary: `Summarize this news text in exactly five bullet points in ${userLang}.`,
    key_takeaways: `Provide key takeaways from this news text in concise bullets in ${userLang}.`,
    explain_simple: `Explain this news simply for a general reader in ${userLang}.`,
    explain_detailed: `Provide a detailed explanation of this news for professional readers in ${userLang}.`,
    translate_hi: "Translate this text to Hindi preserving meaning and tone.",
    translate_en: "Translate this text to English preserving meaning and tone.",
    brief_60: `Create a 60-second news brief in ${userLang} with compact spoken lines.`,
    brief_5m: `Create a 5-minute news brief in ${userLang} with sections and smooth flow.`,
  };

  const { text, tokensUsed } = await callAI(settings, systemPrompt, `${promptByMode[args.mode]}\n\n${args.text}`);
  return { output: text.trim(), tokensUsed };
}

export async function generateAssistantReply(args: {
  uid: string;
  prompt: string;
  language?: "hi" | "en";
}) {
  const settings = await getAISettings();
  const [latestNewsSnap, recs, history] = await Promise.all([
    getAdminDb().collection("news").where("status", "==", "published").orderBy("publishedAt", "desc").limit(30).get(),
    generateRecommendations(args.uid),
    getReadingHistory(args.uid, 10, 0),
  ]);
  const latestNews = latestNewsSnap.docs.map((d) => d.data() as Record<string, unknown>);

  const systemPrompt =
    "You are News Junction AI assistant for mobile readers. Answer only based on supplied context and common-sense summarization. Keep answer short and clear.";
  const context = [
    "Latest headlines:",
    compactNewsContext(latestNews),
    "",
    "Recommendation hints:",
    JSON.stringify(recs.sections || {}, null, 2),
    "",
    "Recent reading history:",
    JSON.stringify(history.slice(0, 5), null, 2),
  ].join("\n");

  const { text, tokensUsed } = await callAI(
    settings,
    systemPrompt,
    `User language: ${args.language || "en"}\nUser question: ${args.prompt}\n\nContext:\n${context}`
  );
  return { output: text.trim(), tokensUsed };
}

export async function getAiCenterData(uid: string) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const [recs, digests, history, trendingSnap] = await Promise.all([
    generateRecommendations(uid),
    getDigests(uid, 6),
    getReadingHistory(uid, 12, 0),
    getAdminDb().collection("news").where("status", "==", "published").where("isTrending", "==", true).orderBy("publishedAt", "desc").limit(12).get(),
  ]);
  return {
    greeting,
    recommendations: recs,
    digests,
    continueReading: history.filter((h) => !(h.completed as boolean)).slice(0, 6),
    trending: trendingSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
  };
}

export async function createChatMessage(uid: string, title: string, prompt: string, response: string) {
  const doc: ChatDoc = { uid, title, prompt, response, pinned: false, createdAt: nowIso(), updatedAt: nowIso() };
  const ref = await getAdminDb().collection("userAIChats").add(doc);
  return { id: ref.id, ...doc };
}

export async function listChatMessages(uid: string, query?: string) {
  const snap = await getAdminDb()
    .collection("userAIChats")
    .where("uid", "==", uid)
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();
  let items: Record<string, unknown>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  if (query) {
    const q = query.toLowerCase();
    items = items.filter((i) => `${String(i["title"] || "")} ${String(i["prompt"] || "")}`.toLowerCase().includes(q));
  }
  return items;
}

export async function pinChatMessage(uid: string, chatId: string, pinned: boolean) {
  const ref = getAdminDb().collection("userAIChats").doc(chatId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) throw new Error("Chat not found");
  await ref.update({ pinned, updatedAt: nowIso() });
  return { updated: true };
}

export async function deleteChatMessage(uid: string, chatId: string) {
  const ref = getAdminDb().collection("userAIChats").doc(chatId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) throw new Error("Chat not found");
  await ref.delete();
  return { removed: true };
}
