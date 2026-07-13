import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import {
  getGoogleTrendsSettings,
  getRecentTrendTopics,
  getTrendAutomationLogs,
  getTrendSourceCandidates,
  updateGoogleTrendsSettings,
} from "@/lib/google-trends/server-db";
import { runFetchGoogleTrends } from "@/lib/google-trends/fetch-pipeline";
import { runResearchTrends } from "@/lib/google-trends/research-pipeline";
import { runProcessTrendArticles } from "@/lib/google-trends/process-pipeline";
import { approveTrendForPublish, rejectTrend } from "@/lib/google-trends/publish-pipeline";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, trends, logs] = await Promise.all([
    getGoogleTrendsSettings(),
    getRecentTrendTopics(100),
    getTrendAutomationLogs(30),
  ]);

  return NextResponse.json({ settings, trends, logs });
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  await updateGoogleTrendsSettings(body.settings || body);
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, trendId, reason } = body;

  switch (action) {
    case "fetch":
      return NextResponse.json({ success: true, ...(await runFetchGoogleTrends()) });
    case "research":
      return NextResponse.json({ success: true, ...(await runResearchTrends(5)) });
    case "generate":
      return NextResponse.json({ success: true, ...(await runProcessTrendArticles(2)) });
    case "approve":
      if (!trendId) return NextResponse.json({ error: "trendId required" }, { status: 400 });
      return NextResponse.json({ success: true, articleId: await approveTrendForPublish(trendId) });
    case "reject":
      if (!trendId) return NextResponse.json({ error: "trendId required" }, { status: 400 });
      await rejectTrend(trendId, reason);
      return NextResponse.json({ success: true });
    case "sources": {
      if (!trendId) return NextResponse.json({ error: "trendId required" }, { status: 400 });
      const sources = await getTrendSourceCandidates(trendId);
      return NextResponse.json({ sources });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
