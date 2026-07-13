import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function logImagePipelineAction(entry: {
  type: "resolve" | "generate" | "validate" | "fallback" | "reject" | "audit";
  articleId?: string;
  rawNewsId?: string;
  strategy?: string;
  origin?: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const db = getAdminDb();
    await db.collection("imagePipelineLogs").add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-blocking
  }
}

export async function countDailyOpenAiImages(): Promise<number> {
  try {
    const db = getAdminDb();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const snap = await db
      .collection("imagePipelineLogs")
      .where("type", "==", "generate")
      .where("createdAt", ">=", start)
      .get();
    return snap.size;
  } catch {
    return 0;
  }
}
