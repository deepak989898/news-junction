/**
 * OpenAI image models routinely fail on Hindi/Tamil/Telugu/etc. and render □ tofu boxes.
 * All in-image titles must be Latin/English only.
 */

/** True if string is safe to render as image text (basic Latin). */
export function isLatinSafeImageText(text: string): boolean {
  const cleaned = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!cleaned) return false;
  return /^[\x20-\x7E]+$/.test(cleaned);
}

/** Strip non-Latin characters for titles used inside image prompts. */
export function toLatinImageText(text: string, fallback = ""): string {
  const cleaned = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 2 && isLatinSafeImageText(cleaned)) return cleaned;
  return fallback;
}

/** Shared hard rules injected into every OpenAI image prompt. */
export const IMAGE_TEXT_HARD_RULES = `IN-IMAGE TEXT RULES (MANDATORY):
- Prefer a CLEAN editorial PHOTOGRAPH with NO on-image captions, tickers, or channel branding.
- Do NOT render website names, "News Junction", TV channel bugs, lower-third bars, breaking-news straps, or subtitle ribbons.
- Do NOT paste the article headline onto the image (the website already shows the title in HTML).
- NEVER render Hindi, Devanagari, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Urdu, Arabic, or any non-Latin script.
- NEVER show empty rectangles, boxes, tofu glyphs (□□□), mojibake, or red/garbled subtitle bars.
- Entertainment ONLY: if a short English movie/series title or small platform logo is essential, keep it secondary and sharp Latin letters only; otherwise omit all lettering.
- If any text cannot be rendered cleanly in English, omit ALL lettering and keep only the photographic subject.`;
