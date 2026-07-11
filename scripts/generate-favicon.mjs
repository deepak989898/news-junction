/**
 * Generates favicons: white background, centered NJ logo, clearly visible in browser tabs.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const defaultSource =
  "C:/Users/pc/.cursor/projects/e-website-News-Junction/assets/c__Users_pc_AppData_Roaming_Cursor_User_workspaceStorage_522ce6ae24e0917600b247d1f3a2a2cd_images_newsjunctionlogo-d592115e-5c54-4519-8e57-ae97955770f0.png";

const source = process.argv[2] || defaultSource;

/** Padding around logo inside the square (8% each side) */
const PADDING_RATIO = 0.08;

async function extractNjMark(src) {
  const meta = await sharp(src).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const cropSize = Math.round(w * 0.52);
  const left = Math.round((w - cropSize) / 2);
  const top = Math.round(h * 0.04);

  return sharp(src).extract({ left, top, width: cropSize, height: cropSize }).png().toBuffer();
}

async function createFavicon(njMark, size) {
  const radius = size / 2;
  const pad = Math.max(2, Math.round(size * PADDING_RATIO));
  const inner = size - pad * 2;

  const logo = await sharp(njMark)
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // White circle on transparent square — rounded look in browser tabs
  const whiteCircle = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="#ffffff"/>
    </svg>`
  );

  return sharp(whiteCircle)
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error("Source logo not found:", source);
    process.exit(1);
  }

  const njMark = await extractNjMark(source);

  const outputs = [
    { size: 512, path: "public/icon-512.png" },
    { size: 192, path: "public/icon-192.png" },
    { size: 180, path: "public/apple-icon.png" },
    { size: 180, path: "src/app/apple-icon.png" },
    { size: 96, path: "public/favicon-96.png" },
    { size: 48, path: "src/app/icon.png" },
    { size: 32, path: "public/favicon.png" },
  ];

  for (const { size, path: relPath } of outputs) {
    const buffer = await createFavicon(njMark, size);
    const out = path.join(root, relPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(buffer).toFile(out);
    console.log("Wrote", relPath);
  }

  const favicon32 = await createFavicon(njMark, 32);
  await sharp(favicon32).toFile(path.join(root, "src/app/favicon.ico"));
  await sharp(favicon32).toFile(path.join(root, "public/favicon.ico"));

  await sharp(source).png().toFile(path.join(root, "public/logo.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
