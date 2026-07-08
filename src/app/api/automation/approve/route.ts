import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { approveAndPublishRawNews, rejectRawNews } from "@/lib/automation/process-pipeline";

export const runtime = "nodejs";

async function verifyAdmin(request: NextRequest) {
  getAdminApp();
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const decoded = await getAuth().verifyIdToken(token);
  const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) return null;

  const role = userDoc.data()?.role;
  if (!["super_admin", "superAdmin", "editor"].includes(role)) return null;

  return { uid: decoded.uid, role };
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rawNewsId } = await request.json();
    if (!rawNewsId) {
      return NextResponse.json({ error: "rawNewsId required" }, { status: 400 });
    }

    const newsId = await approveAndPublishRawNews(rawNewsId);
    return NextResponse.json({ success: true, newsId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
