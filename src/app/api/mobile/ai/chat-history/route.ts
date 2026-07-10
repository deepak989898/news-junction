import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { deleteChatMessage, listChatMessages, pinChatMessage } from "@/lib/mobile-ai/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const query = request.nextUrl.searchParams.get("query") || undefined;
    const items = await listChatMessages(user.uid, query);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch chat history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { chatId, pinned } = await request.json();
    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 });
    const result = await pinChatMessage(user.uid, String(chatId), Boolean(pinned));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pin chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { chatId } = await request.json();
    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 });
    const result = await deleteChatMessage(user.uid, String(chatId));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
