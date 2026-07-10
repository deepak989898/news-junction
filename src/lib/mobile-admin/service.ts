import { getAdminDb } from "@/lib/firebase-admin";

function nowStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toRole(value: unknown) {
  const role = String(value || "viewer");
  if (role === "super_admin" || role === "editor" || role === "moderator") return role;
  return "viewer";
}

export async function getMobileAdminProfile(uid: string) {
  const userDoc = await getAdminDb().collection("users").doc(uid).get();
  if (!userDoc.exists) return { uid, role: "viewer" as const, status: "disabled" as const };
  const data = userDoc.data() as Record<string, unknown>;
  return {
    uid,
    email: String(data.email || ""),
    name: String(data.name || ""),
    role: toRole(data.role),
    status: (String(data.status || "active") === "disabled" ? "disabled" : "active") as "active" | "disabled",
  };
}

export async function getMobileAdminDashboard(uid: string) {
  const todayIso = nowStartIso();
  const [newsSnap, aiPending, socialPending, mediaPending, pushPending, operationsHealth, usageSnap] = await Promise.all([
    getAdminDb().collection("news").orderBy("updatedAt", "desc").limit(500).get(),
    getAdminDb().collection("aiPendingChanges").where("status", "==", "pending").limit(200).get(),
    getAdminDb().collection("socialPostQueue").where("status", "==", "pending").limit(200).get(),
    getAdminDb().collection("mediaGenerationQueue").where("status", "==", "pending").limit(200).get(),
    getAdminDb().collection("notifications").where("status", "==", "scheduled").limit(200).get().catch(() => null),
    getAdminDb().collection("healthChecks").orderBy("createdAt", "desc").limit(1).get(),
    getAdminDb().collection("aiContentLogs").where("createdAt", ">=", todayIso).limit(1000).get().catch(() => null),
  ]);

  const news: Record<string, unknown>[] = newsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const publishedToday = news.filter((n) => String(n["status"]) === "published" && String(n["publishedAt"] || "") >= todayIso).length;
  const drafts = news.filter((n) => String(n["status"]) === "draft").length;
  const trending = news.filter((n) => Boolean(n["isTrending"])).slice(0, 8);
  const pendingEditorialReviews = news.filter((n) => String(n["status"]) === "pending").length;
  const aiCostToday = usageSnap
    ? usageSnap.docs.reduce((acc, d) => acc + Number((d.data() as Record<string, unknown>).estimatedCost || 0), 0)
    : 0;

  return {
    publishedToday,
    drafts,
    pendingAiReviews: aiPending.size,
    pendingEditorialReviews,
    pendingMediaGeneration: mediaPending.size,
    pendingSocialPosts: socialPending.size,
    pendingPushNotifications: pushPending?.size || 0,
    todayVisitors: 0,
    trendingArticles: trending,
    aiCostToday: Number(aiCostToday.toFixed(4)),
    automationStatus: "running",
    healthSummary: operationsHealth.empty ? {} : (operationsHealth.docs[0].data() as Record<string, unknown>),
    latestActivity: news.slice(0, 12),
  };
}

export async function getMobileAdminArticles(opts: { status?: string; query?: string; limit?: number }) {
  const limit = Math.min(200, Math.max(1, Number(opts.limit || 50)));
  const snap = await getAdminDb().collection("news").orderBy("updatedAt", "desc").limit(limit).get();
  let items: Record<string, unknown>[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  if (opts.status) items = items.filter((n) => String(n["status"]) === opts.status);
  if (opts.query) {
    const q = opts.query.toLowerCase();
    items = items.filter((n) =>
      `${String(n["titleEn"] || "")} ${String(n["titleHi"] || "")} ${String(n["slug"] || "")}`.toLowerCase().includes(q)
    );
  }
  return items;
}

export async function setMobileAdminArticleStatus(articleId: string, status: string) {
  await getAdminDb().collection("news").doc(articleId).set({ status, updatedAt: new Date().toISOString() }, { merge: true });
  return { updated: true };
}

export async function mobileAdminSearch(query: string) {
  const q = query.toLowerCase();
  const [news, users, categories, logs] = await Promise.all([
    getAdminDb().collection("news").orderBy("updatedAt", "desc").limit(120).get(),
    getAdminDb().collection("users").limit(120).get(),
    getAdminDb().collection("categories").limit(120).get(),
    getAdminDb().collection("operationLogs").orderBy("createdAt", "desc").limit(120).get().catch(() => null),
  ]);
  const results: Array<Record<string, unknown>> = [];
  news.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const blob = `${String(data.titleEn || "")} ${String(data.titleHi || "")} ${String(data.slug || "")}`.toLowerCase();
    if (blob.includes(q)) results.push({ type: "article", id: d.id, ...data });
  });
  users.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const blob = `${String(data.name || "")} ${String(data.email || "")} ${String(data.role || "")}`.toLowerCase();
    if (blob.includes(q)) results.push({ type: "user", id: d.id, ...data });
  });
  categories.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const blob = `${String(data.nameEn || "")} ${String(data.nameHi || "")} ${String(data.slug || "")}`.toLowerCase();
    if (blob.includes(q)) results.push({ type: "category", id: d.id, ...data });
  });
  logs?.docs.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    const blob = `${String(data.message || "")} ${String(data.type || "")}`.toLowerCase();
    if (blob.includes(q)) results.push({ type: "log", id: d.id, ...data });
  });
  return results.slice(0, 100);
}

export async function getMobileAdminUsers() {
  const snap = await getAdminDb().collection("users").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

export async function updateMobileAdminUser(uid: string, patch: Record<string, unknown>) {
  await getAdminDb().collection("users").doc(uid).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  return { updated: true };
}
