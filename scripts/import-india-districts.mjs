/**
 * Downloads / normalizes all India districts (LGD-style via iaseth/data-for-india)
 * and writes:
 *   src/lib/location/data/india-districts.json
 *   src/lib/location/data/india-cities-generated.json
 *
 * Usage: node scripts/import-india-districts.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import slugify from "slugify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "src/lib/location/data");

const SOURCE_URL =
  "https://raw.githubusercontent.com/iaseth/data-for-india/master/data/readable/districts.json";

/** Source code aliases (iaseth/LGD variants → our state ids) */
const STATE_CODE_TO_ID = {
  AP: "IN-AP",
  AR: "IN-AR",
  AS: "IN-AS",
  BR: "IN-BR",
  CT: "IN-CT",
  CG: "IN-CT",
  GA: "IN-GA",
  GJ: "IN-GJ",
  HR: "IN-HR",
  HP: "IN-HP",
  JH: "IN-JH",
  KA: "IN-KA",
  KL: "IN-KL",
  MP: "IN-MP",
  MH: "IN-MH",
  MN: "IN-MN",
  ML: "IN-ML",
  MZ: "IN-MZ",
  NL: "IN-NL",
  OR: "IN-OR",
  OD: "IN-OR",
  PB: "IN-PB",
  RJ: "IN-RJ",
  SK: "IN-SK",
  TN: "IN-TN",
  TG: "IN-TG",
  TS: "IN-TG",
  TR: "IN-TR",
  UP: "IN-UP",
  UK: "IN-UK",
  WB: "IN-WB",
  DL: "IN-DL",
  JK: "IN-JK",
  LA: "IN-LA",
  CH: "IN-CH",
  PY: "IN-PY",
  AN: "IN-AN",
  LD: "IN-LD",
  DD: "IN-DN",
  DN: "IN-DN",
};

function makeSlug(name, districtCode, usedInState) {
  let base = slugify(name, { lower: true, strict: true });
  if (!base) base = districtCode.toLowerCase();
  if (usedInState.has(base)) {
    base = `${base}-${districtCode.toLowerCase()}`;
  }
  usedInState.add(base);
  return base;
}

async function main() {
  console.log("Fetching districts from", SOURCE_URL);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const raw = await res.json();
  const rows = raw.districts || raw;
  if (!Array.isArray(rows)) throw new Error("Unexpected source format");

  const slugByState = new Map();
  const districts = [];
  const cities = [];
  const skipped = [];

  for (const row of rows) {
    const stateCode = String(row.stateCode || "").trim();
    const stateId = STATE_CODE_TO_ID[stateCode];
    if (!stateId) {
      skipped.push({ reason: "unknown stateCode", row });
      continue;
    }

    const nameEn = String(row.district || "").trim();
    if (!nameEn) continue;

    const districtCodeRaw = String(row.districtCode || "").trim();
    const districtCode =
      districtCodeRaw && districtCodeRaw !== "–" && districtCodeRaw !== "-"
        ? districtCodeRaw
        : slugify(nameEn, { lower: true, strict: true }).slice(0, 8).toUpperCase();

    const canonicalStateCode = stateId.replace(/^IN-/, "");
    const id = `${canonicalStateCode}-${districtCode}`;
    if (!slugByState.has(stateId)) slugByState.set(stateId, new Set());
    const slug = makeSlug(nameEn, districtCode, slugByState.get(stateId));

    districts.push({
      id,
      stateId,
      nameHi: nameEn,
      nameEn,
      slug,
      isActive: true,
      headquarters: row.headquarters ? String(row.headquarters) : undefined,
      sourceStateCode: stateCode,
      sourceDistrictCode: districtCode,
    });

    const hq = row.headquarters ? String(row.headquarters).trim() : nameEn;
    const citySlug = makeSlug(hq, `${districtCode}-hq`, new Set());
    cities.push({
      id: `city-${id}`,
      districtId: id,
      stateId,
      nameHi: hq,
      nameEn: hq,
      slug: citySlug,
      isActive: true,
      nearbyCityIds: [],
      priority: 5,
      isHeadquarters: true,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const districtMeta = {
    version: 1,
    importedAt: new Date().toISOString(),
    source: SOURCE_URL,
    count: districts.length,
    note: "nameHi matches nameEn until Hindi names are enriched manually",
  };

  writeFileSync(
    join(OUT_DIR, "india-districts.json"),
    JSON.stringify({ meta: districtMeta, districts }, null, 2)
  );
  writeFileSync(
    join(OUT_DIR, "india-cities-generated.json"),
    JSON.stringify({ meta: { ...districtMeta, type: "headquarters-cities" }, cities }, null, 2)
  );

  console.log(`Wrote ${districts.length} districts, ${cities.length} HQ cities`);
  if (skipped.length) console.warn(`Skipped ${skipped.length} rows`, skipped.slice(0, 3));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
