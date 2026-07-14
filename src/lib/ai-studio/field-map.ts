import { ContentActionType } from "./types";

export function getTargetField(
  actionType: ContentActionType,
  language: "hi" | "en" | "both" = "both"
): string {
  const map: Partial<Record<ContentActionType, string>> = {
    rewrite_headline: language === "hi" ? "titleHi" : language === "en" ? "titleEn" : "titleHi",
    headline_options: language === "en" ? "titleEn" : "titleHi",
    improve_headline_hi: "titleHi",
    improve_headline_en: "titleEn",
    rewrite_summary: language === "hi" ? "summaryHi" : language === "en" ? "summaryEn" : "summaryHi",
    expand_summary: language === "en" ? "summaryEn" : "summaryHi",
    shorten_summary: language === "en" ? "summaryEn" : "summaryHi",
    improve_content: language === "en" ? "contentEn" : "contentHi",
    notes_to_article: language === "en" ? "contentEn" : "contentHi",
    translate_hi_en: "contentEn",
    translate_en_hi: "contentHi",
    bullet_summary: language === "en" ? "summaryEn" : "summaryHi",
    key_points: language === "en" ? "summaryEn" : "summaryHi",
    faq: "seoFaqItems",
    generate_tags: "tags",
    category_suggestion: "categoryId",
    seo_title: "seoTitle",
    seo_description: "seoDescription",
    push_notification: "pushText",
    newsletter_snippet: "newsletterSnippet",
    social_captions: "socialCaptions",
    editor_note: "editorNote",
    source_credit: "sourceCreditText",
  };
  return map[actionType] || "contentHi";
}
