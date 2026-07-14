import { getAdminDb } from "@/lib/firebase-admin";
import { getAISettings, getUsageStats } from "@/lib/ai-studio/server-db";
import { callAI } from "@/lib/ai-studio/ai-client";
import { getSeoDashboardData } from "@/lib/ai-seo/service";
import { getMediaStudioData } from "@/lib/ai-media/service";
import { getSocialManagerDashboard } from "@/lib/ai-social/service";
import { getVoiceVideoStudioData } from "@/lib/ai-voice-video/service";
import { getEditorialDashboard } from "@/lib/ai-editorial/service";
import { ANALYTICS_ADVISORY_NOTE, ANALYTICS_SETTINGS_DOC_ID, DEFAULT_ANALYTICS_SETTINGS } from "./defaults";
import {
  AnalyticsAiSettings,
  AnalyticsLog,
  AnalyticsReport,
  AnalyticsSourceState,
  AnalyticsSummary,
  ContentPerformanceItem,
  GrowthRecommendation,
  RevenueSummary,
  TrendSuggestion,
} from "./types";

type NewsDoc = Record<string, unknown> & { id: string };

function nowIso() {
  return new Date().toISOString();
}

function dayStartIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function asString(v: unknown) {
  return String(v || "");
}

function toNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeRatio(a: number, b: number): number | null {
  if (!b) return null;
  return Number(((a / b) * 100).toFixed(2));
}

async function logAnalytics(entry: Omit<AnalyticsLog, "id" | "createdAt">) {
  await getAdminDb().collection("analyticsLogs").add({ ...entry, createdAt: nowIso() });
}

export async function getAnalyticsSettings(): Promise<AnalyticsAiSettings> {
  const doc = await getAdminDb().collection("settings").doc(ANALYTICS_SETTINGS_DOC_ID).get();
  if (!doc.exists) return { ...DEFAULT_ANALYTICS_SETTINGS };
  return { ...DEFAULT_ANALYTICS_SETTINGS, ...(doc.data() as AnalyticsAiSettings) };
}

export async function updateAnalyticsSettings(patch: Partial<AnalyticsAiSettings>): Promise<AnalyticsAiSettings> {
  await getAdminDb()
    .collection("settings")
    .doc(ANALYTICS_SETTINGS_DOC_ID)
    .set({ ...DEFAULT_ANALYTICS_SETTINGS, ...patch, updatedAt: nowIso() }, { merge: true });
  await logAnalytics({
    actionType: "summary",
    status: "success",
    message: "Analytics settings updated",
    metadata: patch as Record<string, unknown>,
  });
  return getAnalyticsSettings();
}

function getSourceStates(): AnalyticsSourceState {
  const ga4 = process.env.GA4_PROPERTY_ID && process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY;
  const gsc = process.env.GSC_SITE_URL && process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY;
  const clarity = process.env.CLARITY_PROJECT_ID && process.env.CLARITY_API_TOKEN;
  const fa = process.env.FIREBASE_ANALYTICS_MEASUREMENT_ID;
  return {
    firestore: "enabled",
    ga4: ga4 ? "enabled" : "unavailable",
    searchConsole: gsc ? "enabled" : "unavailable",
    clarity: clarity ? "enabled" : "unavailable",
    firebaseAnalytics: fa ? "enabled" : "unavailable",
  };
}

async function listRecentArticles(limit = 150): Promise<NewsDoc[]> {
  const snap = await getAdminDb()
    .collection("news")
    .where("status", "==", "published")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

function buildInternalSummary(articles: NewsDoc[]): Pick<
  AnalyticsSummary,
  | "topPages"
  | "topCategories"
  | "topAuthors"
  | "todayVisitors"
  | "yesterdayVisitors"
  | "last7DaysVisitors"
  | "last30DaysVisitors"
  | "avgReadingTimeSec"
  | "homepageCtr"
  | "articleCtr"
> {
  const today = dayStartIso(0);
  const yesterday = dayStartIso(-1);
  const d7 = dayStartIso(-7);
  const d30 = dayStartIso(-30);
  let todayViews = 0;
  let yViews = 0;
  let v7 = 0;
  let v30 = 0;

  const byCategory = new Map<string, number>();
  const byAuthor = new Map<string, number>();
  const pages = articles
    .map((a) => {
      const views = toNum(a.views);
      const updatedAt = asString(a.updatedAt);
      if (updatedAt >= today) todayViews += views;
      if (updatedAt >= yesterday && updatedAt < today) yViews += views;
      if (updatedAt >= d7) v7 += views;
      if (updatedAt >= d30) v30 += views;
      const cat = asString(a.categoryNameEn || a.categoryNameHi || "Uncategorized");
      byCategory.set(cat, (byCategory.get(cat) || 0) + views);
      const author = asString(a.author || "Unknown");
      byAuthor.set(author, (byAuthor.get(author) || 0) + views);
      return { path: `/article/${asString(a.slug)}`, value: views, source: "internal_firestore" };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return {
    topPages: pages,
    topCategories: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, value]) => ({ category, value })),
    topAuthors: [...byAuthor.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([author, value]) => ({ author, value })),
    todayVisitors: todayViews || null,
    yesterdayVisitors: yViews || null,
    last7DaysVisitors: v7 || null,
    last30DaysVisitors: v30 || null,
    avgReadingTimeSec: null,
    homepageCtr: null,
    articleCtr: null,
  };
}

async function getCachedSnapshot(rangeKey: string): Promise<AnalyticsSummary | null> {
  const snap = await getAdminDb()
    .collection("analyticsSnapshots")
    .where("rangeKey", "==", rangeKey)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Record<string, unknown>;
  const created = asString(data.createdAt);
  const ageMin = (Date.now() - new Date(created).getTime()) / 60000;
  if (ageMin > 20) return null;
  return data.summary as AnalyticsSummary;
}

async function saveSnapshot(rangeKey: string, summary: AnalyticsSummary) {
  await getAdminDb().collection("analyticsSnapshots").add({
    rangeKey,
    summary,
    createdAt: nowIso(),
  });
}

export async function getAnalyticsSummary(range: "today" | "7d" | "30d" = "7d"): Promise<AnalyticsSummary> {
  const rangeKey = `summary_${range}`;
  const cached = await getCachedSnapshot(rangeKey);
  if (cached) return cached;
  const sources = getSourceStates();
  const articles = await listRecentArticles(180);
  const internal = buildInternalSummary(articles);
  const notes: string[] = [];
  if (sources.ga4 !== "enabled") notes.push("GA4 unavailable: configure GA4 credentials to enable visitor/session metrics.");
  if (sources.searchConsole !== "enabled") notes.push("Search Console unavailable: configure GSC credentials to enable impressions/clicks.");
  if (sources.clarity !== "enabled") notes.push("Microsoft Clarity unavailable: configure Clarity API token for behavior insights.");
  if (sources.firebaseAnalytics !== "enabled") notes.push("Firebase Analytics unavailable: measurement ID not configured.");

  const summary: AnalyticsSummary = {
    sources,
    ...internal,
    topSearches: [],
    returningUsers: null,
    newUsers: null,
    bounceRate: null,
    trafficSources: [],
    devices: [],
    countries: [],
    languages: [],
    referrals: [],
    generatedAt: nowIso(),
    notes,
  };
  await saveSnapshot(rangeKey, summary);
  await logAnalytics({ actionType: "summary", status: "success", message: `Analytics summary generated (${range})` });
  return summary;
}

async function getContentPerformanceItems(limit = 120): Promise<ContentPerformanceItem[]> {
  const [articles, seoDash, editorialDash] = await Promise.all([
    listRecentArticles(limit),
    getSeoDashboardData(),
    getEditorialDashboard(),
  ]);

  const editorialByArticle = new Map<string, number>();
  ((editorialDash.reviews || []) as Record<string, unknown>[]).forEach((r) => {
    const id = asString(r.articleId);
    if (!editorialByArticle.has(id)) editorialByArticle.set(id, toNum(r.reviewScore, 0));
  });

  const items = articles.map((a) => {
    const views = toNum(a.views, 0);
    return {
      articleId: a.id,
      title: asString(a.titleEn || a.titleHi || a.slug),
      category: asString(a.categoryNameEn || a.categoryNameHi || "Uncategorized"),
      author: asString(a.author || "Unknown"),
      views,
      uniqueVisitors: null,
      readingCompletionEstimate: null,
      socialShares: null,
      bookmarkCount: null,
      comments: null,
      avgEngagement: null,
      trafficTrend: views > 400 ? "up" : views < 60 ? "down" : "stable",
      aiQualityScore: null,
      editorialScore: editorialByArticle.get(a.id) ?? null,
      seoScore: null,
      updatedAt: asString(a.updatedAt || nowIso()),
    } as ContentPerformanceItem;
  });

  const seoLogs = (seoDash.logs || []) as Record<string, unknown>[];
  seoLogs.forEach((l) => {
    const articleId = asString(l.articleId);
    const item = items.find((x) => x.articleId === articleId);
    if (item && item.seoScore === null) {
      item.seoScore = Math.max(0, Math.min(100, 60 + (toNum(l.seoScoreAfter, 0) - toNum(l.seoScoreBefore, 0))));
    }
  });

  return items.sort((a, b) => b.views - a.views);
}

export async function getContentPerformance() {
  const data = await getContentPerformanceItems(120);
  await Promise.all(
    data.slice(0, 120).map((item) =>
      getAdminDb()
        .collection("contentPerformance")
        .doc(item.articleId)
        .set({ ...item, updatedAt: nowIso() }, { merge: true })
    )
  );
  await logAnalytics({ actionType: "content_performance", status: "success", message: "Content performance refreshed" });
  return { items: data, generatedAt: nowIso() };
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const content = await getContentPerformanceItems(120);
  const byCategory = new Map<string, number>();
  const byDevice = new Map<string, number>([
    ["mobile", 0],
    ["desktop", 0],
    ["tablet", 0],
  ]);
  const byCountry = new Map<string, number>();
  const byPage = content.slice(0, 60).map((x) => {
    const est = Number((x.views * 0.002).toFixed(2));
    byCategory.set(x.category, (byCategory.get(x.category) || 0) + est);
    byDevice.set("mobile", (byDevice.get("mobile") || 0) + est * 0.7);
    byDevice.set("desktop", (byDevice.get("desktop") || 0) + est * 0.25);
    byDevice.set("tablet", (byDevice.get("tablet") || 0) + est * 0.05);
    return { page: `/article/${x.articleId}`, value: est };
  });
  byCountry.set("Unavailable", byPage.reduce((sum, p) => sum + p.value, 0));
  const estimatedRevenue = Number(byPage.reduce((sum, p) => sum + p.value, 0).toFixed(2));
  const summary: RevenueSummary = {
    estimatedRevenue,
    trend: "stable",
    revenueByPage: byPage.slice(0, 20),
    revenueByCategory: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, value]) => ({ category, value: Number(value.toFixed(2)) })),
    revenueByDevice: [...byDevice.entries()].map(([device, value]) => ({ device, value: Number(value.toFixed(2)) })),
    revenueByCountry: [...byCountry.entries()].map(([country, value]) => ({ country, value: Number(value.toFixed(2)) })),
    topRevenueArticles: content.slice(0, 10).map((x) => ({
      articleId: x.articleId,
      title: x.title,
      value: Number((x.views * 0.002).toFixed(2)),
    })),
    topRevenueCategories: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, value]) => ({ category, value: Number(value.toFixed(2)) })),
    topAdPositions: [
      { position: "header", value: Number((estimatedRevenue * 0.28).toFixed(2)) },
      { position: "sidebar", value: Number((estimatedRevenue * 0.33).toFixed(2)) },
      { position: "inArticle", value: Number((estimatedRevenue * 0.39).toFixed(2)) },
    ],
    placeholders: [
      "Revenue uses placeholder model based on internal page views.",
      "AdSense, affiliate, and sponsored APIs are not connected yet.",
    ],
    generatedAt: nowIso(),
  };
  await getAdminDb().collection("revenueReports").add({ ...summary, createdAt: nowIso() });
  await logAnalytics({ actionType: "revenue_summary", status: "success", message: "Revenue summary generated" });
  return summary;
}

export async function discoverTrends() {
  const content = await getContentPerformanceItems(180);
  const byCategory = new Map<string, number>();
  const keywords = new Map<string, number>();
  content.forEach((c) => {
    byCategory.set(c.category, (byCategory.get(c.category) || 0) + c.views);
    c.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8)
      .forEach((k) => keywords.set(k, (keywords.get(k) || 0) + 1));
  });
  const trends: TrendSuggestion[] = [
    ...[...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, views], idx) => ({
        trendType: "emerging_category" as const,
        title: `${category} audience interest`,
        description: `${category} shows notable activity in internal traffic patterns.`,
        category,
        keywords: [],
        priority: idx < 2 ? ("high" as const) : ("medium" as const),
        status: "pending" as const,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })),
    ...[...keywords.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword], idx) => ({
        trendType: "keyword_opportunity" as const,
        title: `Keyword opportunity: ${keyword}`,
        description: `Potential keyword cluster detected from top-performing article titles.`,
        keywords: [keyword],
        priority: idx < 3 ? ("high" as const) : ("low" as const),
        status: "pending" as const,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })),
  ];
  await Promise.all(trends.map((t) => getAdminDb().collection("trendSuggestions").add(t)));
  await logAnalytics({ actionType: "trend_discovery", status: "success", message: "Trend discovery completed" });
  return { suggestions: trends, generatedAt: nowIso() };
}

async function aiGrowthInsights(summary: AnalyticsSummary, content: ContentPerformanceItem[]) {
  const settings = await getAnalyticsSettings();
  if (!settings.insightsEnabled) return { recommendations: [] as GrowthRecommendation[] };
  const aiSettings = await getAISettings();
  const prompt = `Generate JSON with key recommendations (array). Each recommendation must include:
title, reason, expectedBenefit, priority(high|medium|low), confidence(low|medium|high), recommendationType from:
improve_headline, improve_meta, refresh_article, add_faq, add_internal_links, follow_up_article, translate_article, generate_newsletter, generate_push, share_social, create_audio, create_video_package.

Analytics summary:
todayVisitors=${summary.todayVisitors}
last7DaysVisitors=${summary.last7DaysVisitors}
topCategories=${summary.topCategories.map((x) => `${x.category}:${x.value}`).join(", ")}
topPages=${summary.topPages.slice(0, 8).map((x) => `${x.path}:${x.value}`).join(", ")}
notes=${summary.notes.join(" | ")}

Top content:
${content
  .slice(0, 12)
  .map((c) => `${c.articleId} | ${c.title} | views=${c.views} | trend=${c.trafficTrend} | editorial=${c.editorialScore} | seo=${c.seoScore}`)
  .join("\n")}

Rules:
- advisory only
- no guarantees
- avoid certainty claims
- avoid fabricated analytics
- max 12 recommendations
`;
  const { text } = await callAI(aiSettings, "You are a growth analyst for a newsroom.", prompt);
  const json = text.match(/\{[\s\S]*\}/)?.[0] || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const raw = Array.isArray(parsed.recommendations) ? (parsed.recommendations as Record<string, unknown>[]) : [];
  const recommendations: GrowthRecommendation[] = raw.slice(0, 12).map((r) => ({
    title: asString(r.title || "Growth opportunity"),
    reason: asString(r.reason || "Potential performance improvement."),
    expectedBenefit: asString(r.expectedBenefit || "Improved engagement."),
    priority: (["high", "medium", "low"].includes(asString(r.priority)) ? asString(r.priority) : "medium") as
      | "high"
      | "medium"
      | "low",
    confidence: (["low", "medium", "high"].includes(asString(r.confidence)) ? asString(r.confidence) : "medium") as
      | "low"
      | "medium"
      | "high",
    recommendationType: ([
      "improve_headline",
      "improve_meta",
      "refresh_article",
      "add_faq",
      "add_internal_links",
      "follow_up_article",
      "translate_article",
      "generate_newsletter",
      "generate_push",
      "share_social",
      "create_audio",
      "create_video_package",
    ].includes(asString(r.recommendationType))
      ? asString(r.recommendationType)
      : "refresh_article") as GrowthRecommendation["recommendationType"],
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  return { recommendations };
}

export async function getGrowthInsights() {
  const [summary, content, seoDash, voice, media, social, editorial] = await Promise.all([
    getAnalyticsSummary("7d"),
    getContentPerformanceItems(150),
    getSeoDashboardData(),
    getVoiceVideoStudioData(),
    getMediaStudioData(),
    getSocialManagerDashboard(),
    getEditorialDashboard(),
  ]);
  const ai = await aiGrowthInsights(summary, content);
  const deterministic: GrowthRecommendation[] = [];
  content.slice(0, 20).forEach((c) => {
    if ((c.editorialScore ?? 100) < 65) {
      deterministic.push({
        articleId: c.articleId,
        category: c.category,
        title: `Improve editorial quality: ${c.title}`,
        reason: "Editorial score is below threshold.",
        expectedBenefit: "Higher trust and better retention.",
        priority: "high",
        confidence: "medium",
        recommendationType: "refresh_article",
        status: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    if ((c.seoScore ?? 100) < 65) {
      deterministic.push({
        articleId: c.articleId,
        category: c.category,
        title: `Improve SEO metadata: ${c.title}`,
        reason: "SEO score appears below target.",
        expectedBenefit: "Potential uplift in impressions and CTR.",
        priority: "medium",
        confidence: "medium",
        recommendationType: "improve_meta",
        status: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  });
  const recs = [...deterministic, ...ai.recommendations].slice(0, 24);
  const saved = await Promise.all(
    recs.map(async (r) => {
      const ref = await getAdminDb().collection("growthRecommendations").add(r);
      return { ...r, id: ref.id };
    })
  );
  await logAnalytics({
    actionType: "growth_insights",
    status: "success",
    message: `Growth insights generated (${saved.length})`,
    metadata: {
      seoLogs: (seoDash.logs || []).length,
      socialQueue: ((social.queue || []) as unknown[]).length,
      editorialReviews: ((editorial.reviews || []) as unknown[]).length,
      mediaAssets: ((media.assets || []) as unknown[]).length,
      voiceAudio: ((voice.audioAssets || []) as unknown[]).length,
    },
  });
  return { recommendations: saved, advisory: ANALYTICS_ADVISORY_NOTE, generatedAt: nowIso() };
}

export async function generateAnalyticsReport(args: {
  reportType: "daily" | "weekly" | "monthly";
  createdBy: string;
}) {
  const [summary, content, revenue, seo, aiUsage, editorial] = await Promise.all([
    getAnalyticsSummary(args.reportType === "daily" ? "today" : args.reportType === "weekly" ? "7d" : "30d"),
    getContentPerformance(),
    getRevenueSummary(),
    getSeoDashboardData(),
    getUsageStats(),
    getEditorialDashboard(),
  ]);

  const report: Omit<AnalyticsReport, "id"> = {
    reportType: args.reportType,
    dateRange: {
      from: args.reportType === "daily" ? dayStartIso(0) : args.reportType === "weekly" ? dayStartIso(-7) : dayStartIso(-30),
      to: nowIso(),
    },
    traffic: summary as unknown as Record<string, unknown>,
    seo: seo as unknown as Record<string, unknown>,
    revenue: revenue as unknown as Record<string, unknown>,
    contentPerformance: content as unknown as Record<string, unknown>,
    aiActivity: aiUsage as unknown as Record<string, unknown>,
    editorialActivity: editorial as unknown as Record<string, unknown>,
    automationSummary: {},
    createdBy: args.createdBy,
    createdAt: nowIso(),
  };
  const ref = await getAdminDb().collection("analyticsReports").add(report);
  await logAnalytics({ actionType: "report_generate", status: "success", message: `Generated ${args.reportType} report`, createdBy: args.createdBy });
  return { id: ref.id, ...report };
}

export async function exportAnalytics(args: {
  format: "csv" | "excel" | "pdf";
  reportType: "daily" | "weekly" | "monthly";
  createdBy: string;
}) {
  const report = await generateAnalyticsReport({ reportType: args.reportType, createdBy: args.createdBy });
  if (args.format === "pdf") {
    await logAnalytics({
      actionType: "export",
      status: "success",
      message: "PDF export requested but rendered as text fallback due to no PDF renderer dependency.",
      createdBy: args.createdBy,
    });
    return {
      format: "pdf",
      contentType: "text/plain",
      filename: `analytics-${args.reportType}-${Date.now()}.txt`,
      content: `PDF export placeholder.\n\nReport ID: ${report.id}\nUse CSV/Excel export for structured data.\n`,
      advisory: "PDF renderer not configured. Returning plain-text fallback.",
    };
  }
  const rows = [
    ["metric", "value"],
    ["reportType", report.reportType],
    ["from", report.dateRange.from],
    ["to", report.dateRange.to],
    ["todayVisitors", String((report.traffic as Record<string, unknown>).todayVisitors ?? "unavailable")],
    ["last7DaysVisitors", String((report.traffic as Record<string, unknown>).last7DaysVisitors ?? "unavailable")],
    ["estimatedRevenue", String((report.revenue as Record<string, unknown>).estimatedRevenue ?? "unavailable")],
    ["advisory", ANALYTICS_ADVISORY_NOTE],
  ];
  const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  await logAnalytics({
    actionType: "export",
    status: "success",
    message: `${args.format.toUpperCase()} export generated`,
    createdBy: args.createdBy,
  });
  return {
    format: args.format,
    contentType: args.format === "excel" ? "text/csv" : "text/csv",
    filename: `analytics-${args.reportType}-${Date.now()}.${args.format === "excel" ? "csv" : "csv"}`,
    content: csv,
  };
}
