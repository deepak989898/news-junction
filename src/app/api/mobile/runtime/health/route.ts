import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const [health, operations, aiSettings] = await Promise.all([
      getAdminDb().collection("healthChecks").orderBy("createdAt", "desc").limit(1).get().catch(() => null),
      getAdminDb().collection("settings").doc("operations").get().catch(() => null),
      getAdminDb().collection("settings").doc("aiStudio").get().catch(() => null),
    ]);
    return NextResponse.json({
      firebaseStatus: "ok",
      apiStatus: "ok",
      health: health?.empty ? {} : health?.docs[0].data(),
      operations: operations?.exists ? operations.data() : {},
      aiBackend: aiSettings?.exists ? aiSettings.data() : {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load health";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
