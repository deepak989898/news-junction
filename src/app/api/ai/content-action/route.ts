import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { executeContentAction } from "@/lib/ai-studio/content-actions";
import { ContentActionType } from "@/lib/ai-studio/types";

export const runtime = "nodejs";

const VALID_ACTIONS: ContentActionType[] = [
  "rewrite_headline",
  "headline_options",
  "improve_headline_hi",
  "improve_headline_en",
  "rewrite_summary",
  "expand_summary",
  "shorten_summary",
  "improve_content",
  "notes_to_article",
  "translate_hi_en",
  "translate_en_hi",
  "bullet_summary",
  "key_points",
  "faq",
  "generate_tags",
  "category_suggestion",
  "seo_title",
  "seo_description",
  "push_notification",
  "newsletter_snippet",
  "social_captions",
  "editor_note",
  "source_credit",
];

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { articleId, actionType, language = "both", customInstruction } = body;

    if (!articleId || !actionType) {
      return NextResponse.json({ error: "articleId and actionType required" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(actionType)) {
      return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
    }

    const result = await executeContentAction(
      articleId,
      actionType,
      language,
      customInstruction,
      admin.uid,
      admin.name || admin.email
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
