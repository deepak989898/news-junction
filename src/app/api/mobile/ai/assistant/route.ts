import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { createChatMessage, generateAssistantReply } from "@/lib/mobile-ai/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { prompt, language = "en" } = await request.json();
    if (!prompt || String(prompt).trim().length < 2) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const reply = await generateAssistantReply({ uid: user.uid, prompt: String(prompt), language });
    const title = String(prompt).trim().slice(0, 60);
    const chat = await createChatMessage(user.uid, title, String(prompt), reply.output);
    return NextResponse.json({ ...reply, chat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
