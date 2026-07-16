import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { upsertSubscriber } from "@/lib/newsletter/send";
import { getAdminDb } from "@/lib/firebase-admin";
import { NEWSLETTER_SUBSCRIBERS_COLLECTION } from "@/lib/newsletter/config";

export const runtime = "nodejs";

const MAX_PER_IP_PER_HOUR = 8;

function clamp(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`nj-newsletter:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Honeypot
  if (clamp(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const email = clamp(body.email, 200);
  const language = clamp(body.language, 5) === "en" ? "en" : "hi";
  const source = clamp(body.source, 40) || "website";

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip);

  try {
    const db = getAdminDb();
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recent = await db
        .collection(NEWSLETTER_SUBSCRIBERS_COLLECTION)
        .where("ipHash", "==", ipHash)
        .where("createdAt", ">=", since)
        .count()
        .get();
      if ((recent.data().count as number) >= MAX_PER_IP_PER_HOUR) {
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    } catch {
      // index may be missing — continue
    }

    const result = await upsertSubscriber({ email, language, source });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // Store ipHash on create for rate limiting (best-effort).
    if (result.created) {
      await db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).doc(result.id).set(
        { ipHash },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      message: result.created ? "Subscribed successfully." : "You are already subscribed.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not subscribe. Please try again." },
      { status: 500 }
    );
  }
}
