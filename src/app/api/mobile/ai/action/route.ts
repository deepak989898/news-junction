import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { generateUserAiText } from "@/lib/mobile-ai/service";

export const runtime = "nodejs";

const VALID_MODES = [
  "summary",
  "bullet_summary",
  "key_takeaways",
  "explain_simple",
  "explain_detailed",
  "translate_hi",
  "translate_en",
  "brief_60",
  "brief_5m",
] as const;

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { mode, text, language = "en" } = await request.json();
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    if (!text || String(text).trim().length < 10) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const data = await generateUserAiText({ mode, text: String(text), language });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
