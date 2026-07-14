import "server-only";

import { VARIANT_SIZES } from "./quality-config";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapHeadline(text: string, maxChars = 56): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= 2) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < 2) lines.push(current);
  if (lines.length === 2 && clean.length > lines.join(" ").length) {
    lines[1] = `${lines[1].replace(/\s+\S*$/, "").trim()}…`;
  }
  return lines.slice(0, 2);
}

/**
 * Deterministic branded lower-third overlay using actual article text.
 * Does NOT invent numbers — only overlays provided headline/category.
 */
export async function applyNewsTextOverlay(
  imageBuffer: Buffer,
  args: {
    headline: string;
    categoryLabel?: string;
    live?: boolean;
  }
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const width = VARIANT_SIZES.large.width;
  const height = VARIANT_SIZES.large.height;
  const lines = wrapHeadline(args.headline, 54).map(escapeXml);
  const category = escapeXml((args.categoryLabel || "NEWS").toUpperCase().slice(0, 28));
  const line1 = lines[0] || "";
  const line2 = lines[1] || "";
  const fontSize = line2 ? 42 : 48;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#0A1628" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#07101C" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bar)"/>
  <rect x="48" y="${height - 210}" width="8" height="140" fill="#E11D2E"/>
  <rect x="72" y="${height - 208}" width="${Math.min(220, 40 + category.length * 10)}" height="30" rx="4" fill="#E11D2E"/>
  <text x="84" y="${height - 186}" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" letter-spacing="1.5">${category}</text>
  ${
    args.live
      ? `<rect x="${width - 140}" y="36" width="92" height="28" rx="4" fill="#E11D2E"/><text x="${width - 118}" y="55" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">● LIVE</text>`
      : ""
  }
  <text x="72" y="${height - 125}" font-family="Segoe UI, Noto Sans Devanagari, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#FFFFFF">${line1}</text>
  ${
    line2
      ? `<text x="72" y="${height - 70}" font-family="Segoe UI, Noto Sans Devanagari, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#FFFFFF">${line2}</text>`
      : ""
  }
</svg>`;

  const base = await sharp(imageBuffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .toBuffer();

  return sharp(base)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}
