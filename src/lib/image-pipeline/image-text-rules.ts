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
export const IMAGE_TEXT_HARD_RULES = `IN-IMAGE TEXT RULES (MANDATORY — OpenAI cannot render Indic scripts correctly):
- Use ONLY English / Latin letters (A–Z, a–z), digits, and basic punctuation inside the image.
- NEVER render Hindi, Devanagari, Tamil, Telugu, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Urdu, Arabic, or any non-Latin script.
- NEVER show empty rectangles, boxes, tofu glyphs (□□□), mojibake, or red/garbled subtitle bars.
- NEVER paste the full Hindi headline into the picture.
- If a movie/series has a local-language title, show ONLY the English transliteration (example: "Maa Inti Bangaaram") — not native script.
- Prefer: actor portrait + short English title + small platform logo. If title text cannot be rendered cleanly in English, omit title lettering and keep only the portrait + logo.
- Any on-image English text must be sharp, correctly spelled, high-contrast, and fully readable at thumbnail size.`;
