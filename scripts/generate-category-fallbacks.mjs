/**
 * Generates branded category fallback images for News Junction.
 * Run: node scripts/generate-category-fallbacks.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "images", "fallbacks");
const logoPath = path.join(root, "public", "logo.png");

const WIDTH = 1280;
const HEIGHT = 720;

/** @type {{ id: string; en: string; hi: string; from: string; to: string; accent: string }[]} */
const CATEGORIES = [
  { id: "desh", en: "DESH", hi: "देश", from: "#0B1F3A", to: "#163A66", accent: "#E11D2E" },
  { id: "rajya", en: "RAJYA", hi: "राज्य", from: "#102A43", to: "#243B53", accent: "#E11D2E" },
  { id: "duniya", en: "DUNIYA", hi: "दुनिया", from: "#0F2C4A", to: "#1B4F72", accent: "#E11D2E" },
  { id: "khel", en: "KHEL", hi: "खेल", from: "#0C3B2E", to: "#145A32", accent: "#E11D2E" },
  { id: "manoranjan", en: "MANORANJAN", hi: "मनोरंजन", from: "#3B0A2A", to: "#6B1E4A", accent: "#E11D2E" },
  { id: "technology", en: "TECHNOLOGY", hi: "टेक्नोलॉजी", from: "#0A2540", to: "#123F6B", accent: "#E11D2E" },
  { id: "vyapar", en: "VYAPAR", hi: "व्यापार", from: "#1A2332", to: "#2C3E50", accent: "#E11D2E" },
  { id: "swasthya", en: "SWASTHYA", hi: "स्वास्थ्य", from: "#0E3D3A", to: "#1A5C57", accent: "#E11D2E" },
  { id: "video", en: "VIDEO", hi: "वीडियो", from: "#1A1030", to: "#3D1F5C", accent: "#E11D2E" },
  { id: "court", en: "COURT", hi: "कोर्ट", from: "#1F2430", to: "#3A4254", accent: "#E11D2E" },
  { id: "rajniti", en: "RAJNITI", hi: "राजनीति", from: "#2A0F1A", to: "#5A1E2E", accent: "#E11D2E" },
  { id: "mausam", en: "MAUSAM", hi: "मौसम", from: "#0A3448", to: "#156F8A", accent: "#E11D2E" },
  { id: "shiksha", en: "SHIKSHA", hi: "शिक्षा", from: "#1A2744", to: "#2E4A7A", accent: "#E11D2E" },
  { id: "vigyan", en: "VIGYAN", hi: "विज्ञान", from: "#0D2137", to: "#1B4D6E", accent: "#E11D2E" },
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg(cat) {
  const en = escapeXml(cat.en);
  const hi = escapeXml(cat.hi);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cat.from}"/>
      <stop offset="100%" stop-color="${cat.to}"/>
    </linearGradient>
    <linearGradient id="fade" x1="0%" y1="40%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="22%" r="45%">
      <stop offset="0%" stop-color="${cat.accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${cat.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <!-- geometric news frame -->
  <path d="M0 0 H${WIDTH} V8 H0 Z" fill="${cat.accent}"/>
  <path d="M0 ${HEIGHT - 8} H${WIDTH} V${HEIGHT} Z" fill="#0A1628"/>
  <path d="M80 120 H320" stroke="${cat.accent}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="1080" cy="180" r="120" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="2"/>
  <circle cx="1120" cy="520" r="180" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="2"/>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/>

  <text x="80" y="250" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#FFFFFF" fill-opacity="0.85" letter-spacing="6">NEWS JUNCTION</text>
  <text x="80" y="360" font-family="Segoe UI, Noto Sans Devanagari, Arial, sans-serif" font-size="96" font-weight="800" fill="#FFFFFF">${hi}</text>
  <text x="80" y="450" font-family="Segoe UI, Arial, sans-serif" font-size="48" font-weight="700" fill="${cat.accent}" letter-spacing="4">${en}</text>
  <text x="80" y="620" font-family="Segoe UI, Noto Sans Devanagari, Arial, sans-serif" font-size="26" fill="#FFFFFF" fill-opacity="0.75">सच्ची खबर, हर नजर  ·  REAL NEWS, REAL IMPACT</text>
</svg>`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  let logoBuf = null;
  try {
    logoBuf = await sharp(logoPath)
      .resize(160, 160, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    console.warn("logo.png not found — generating without logo mark");
  }

  for (const cat of CATEGORIES) {
    const svg = Buffer.from(buildSvg(cat));
    let image = sharp(svg).resize(WIDTH, HEIGHT);

    if (logoBuf) {
      image = image.composite([
        {
          input: logoBuf,
          top: HEIGHT - 190,
          left: WIDTH - 210,
        },
      ]);
    }

    const outPath = path.join(outDir, `${cat.id}.webp`);
    await image.webp({ quality: 84 }).toFile(outPath);
    console.log("wrote", path.relative(root, outPath));
  }

  console.log(`\nDone — ${CATEGORIES.length} fallbacks in public/images/fallbacks/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
