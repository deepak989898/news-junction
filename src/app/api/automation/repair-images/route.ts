import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { repairPublishedNewsImage } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const newsIds = Array.isArray(body.newsIds) ? body.newsIds : body.newsId ? [body.newsId] : [];
    const repairAll = Boolean(body.repairAll);

    let ids: string[] = newsIds.filter((id: unknown) => typeof id === "string" && id.length > 0);

    if (repairAll) {
      const snapshot = await getAdminDb()
        .collection("news")
        .where("status", "==", "published")
        .orderBy("publishedAt", "desc")
        .limit(80)
        .get();

      ids = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          if (!data.isAutomated) return false;
          const url = String(data.imageUrl || "");
          return (
            !url ||
            url === "/logo.png" ||
            (!url.includes("firebasestorage.googleapis.com") && url.startsWith("http"))
          );
        })
        .map((doc) => doc.id)
        .slice(0, 20);
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "newsId, newsIds, or repairAll required" }, { status: 400 });
    }

    const results: Array<{ newsId: string; imageUrl?: string; source?: string; error?: string }> = [];

    for (const newsId of ids) {
      try {
        const result = await repairPublishedNewsImage(newsId);
        results.push({ newsId, imageUrl: result.imageUrl, source: result.source });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Repair failed";
        results.push({ newsId, error: message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
