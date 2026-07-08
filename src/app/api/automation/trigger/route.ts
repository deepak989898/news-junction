import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";
import { runFetchNews, runProcessNews } from "@/lib/automation/fetch-pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

async function verifySuperAdmin(request: NextRequest) {
  getAdminApp();
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const decoded = await getAuth().verifyIdToken(token);
  const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "superAdmin") return null;
  return decoded.uid;
}

export async function POST(request: NextRequest) {
  const uid = await verifySuperAdmin(request);
  if (!uid) {
    return NextResponse.json({ error: "Super admin required" }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    if (action === "fetch") {
      const result = await runFetchNews();
      return NextResponse.json({ success: true, ...result });
    }
    if (action === "process") {
      const result = await runProcessNews(5);
      return NextResponse.json({ success: true, ...result });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
