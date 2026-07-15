import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/trust/types";
import { CONTACT_SUBMISSIONS_COLLECTION } from "@/lib/trust/defaults";

export const runtime = "nodejs";

const MAX_PER_IP_PER_HOUR = 5;
const VALID_CATEGORIES = new Set(CONTACT_CATEGORIES.map((c) => c.value));

function clamp(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`nj-contact:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: silently accept (do not store) so bots think they succeeded.
  if (clamp(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = clamp(body.name, 120);
  const email = clamp(body.email, 200);
  const phone = clamp(body.phone, 40);
  const subject = clamp(body.subject, 200);
  const message = clamp(body.message, 5000);
  const articleUrl = clamp(body.articleUrl, 500);
  const rawCategory = clamp(body.category, 40) as ContactCategory;
  const category: ContactCategory = VALID_CATEGORIES.has(rawCategory) ? rawCategory : "general";
  const language = clamp(body.language, 5) === "en" ? "en" : "hi";

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { ok: false, error: "Please fill all required fields." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json({ ok: false, error: "Message is too short." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip);
  const userAgent = clamp(request.headers.get("user-agent"), 300);

  try {
    const db = getAdminDb();

    // Rate limit: max submissions per IP per hour (best-effort).
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await db
        .collection(CONTACT_SUBMISSIONS_COLLECTION)
        .where("ipHash", "==", ipHash)
        .where("createdAt", ">=", since)
        .count()
        .get();
      if ((recent.data().count as number) >= MAX_PER_IP_PER_HOUR) {
        return NextResponse.json(
          { ok: false, error: "Too many messages. Please try again later." },
          { status: 429 }
        );
      }
    } catch {
      // Missing index — skip rate limiting rather than fail the submission.
    }

    await db.collection(CONTACT_SUBMISSIONS_COLLECTION).add({
      name,
      email,
      phone,
      category,
      subject,
      message,
      articleUrl,
      language,
      status: "new",
      internalNotes: "",
      ipHash,
      userAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not send your message. Please try again." },
      { status: 500 }
    );
  }
}
