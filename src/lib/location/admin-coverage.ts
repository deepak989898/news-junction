import { getAdminDb } from "@/lib/firebase-admin";
import { getDailyNewsDistribution, DEFAULT_LOCAL_NEWS_SETTINGS } from "./quota";
import { INDIA_STATES } from "./data/india-states";
import { detectArticleLocation } from "./detection";
import { geoFieldsToFirestore } from "./geo-firestore";
import {
  getAllCities,
  getAllDistricts,
  getLocationDatasetMeta,
} from "./district-registry";

export interface LocationCoverageReport {
  generatedAt: string;
  distribution: Awaited<ReturnType<typeof getDailyNewsDistribution>>;
  settings: typeof DEFAULT_LOCAL_NEWS_SETTINGS;
  dataset: ReturnType<typeof getLocationDatasetMeta>;
  statesWithNews: number;
  statesWithoutNews: string[];
  districtsWithNews: number;
  citiesWithNews: number;
  articlesByState: Record<string, number>;
  lowConfidenceCount: number;
  unmappedCount: number;
  emptyLocationPages: string[];
}

export async function getLocationCoverageReport(): Promise<LocationCoverageReport> {
  const db = getAdminDb();
  const distribution = await getDailyNewsDistribution();
  const allCities = getAllCities();

  const snap = await db
    .collection("news")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(500)
    .get();

  const articlesByState: Record<string, number> = {};
  let lowConfidenceCount = 0;
  let unmappedCount = 0;
  const statesWithNewsSet = new Set<string>();
  const districtsWithNewsSet = new Set<string>();
  const citiesWithNewsSet = new Set<string>();

  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.geoConfidence != null && Number(d.geoConfidence) < 65) lowConfidenceCount += 1;
    if (!d.geoScope && !d.stateId) unmappedCount += 1;
    if (d.stateId) {
      statesWithNewsSet.add(String(d.stateId));
      articlesByState[String(d.stateId)] = (articlesByState[String(d.stateId)] || 0) + 1;
    }
    if (d.districtId) districtsWithNewsSet.add(String(d.districtId));
    if (d.cityId) citiesWithNewsSet.add(String(d.cityId));
  });

  const statesWithoutNews = INDIA_STATES.filter(
    (s) => s.isActive && !statesWithNewsSet.has(s.id)
  ).map((s) => s.nameEn);

  const emptyLocationPages: string[] = [];
  for (const state of INDIA_STATES.filter((s) => s.isActive)) {
    if (!statesWithNewsSet.has(state.id)) emptyLocationPages.push(`/state/${state.slug}`);
  }
  for (const city of allCities.filter((c) => c.isActive)) {
    if (!citiesWithNewsSet.has(city.id)) emptyLocationPages.push(`/city/${city.slug}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    distribution,
    settings: DEFAULT_LOCAL_NEWS_SETTINGS,
    dataset: getLocationDatasetMeta(),
    statesWithNews: statesWithNewsSet.size,
    statesWithoutNews,
    districtsWithNews: districtsWithNewsSet.size,
    citiesWithNews: citiesWithNewsSet.size,
    articlesByState,
    lowConfidenceCount,
    unmappedCount,
    emptyLocationPages: emptyLocationPages.slice(0, 50),
  };
}

export interface BackfillResult {
  processed: number;
  updated: number;
  skippedReviewed: number;
  highConfidence: number;
  needsReview: number;
  national: number;
  international: number;
  unknown: number;
  errors: string[];
}

export async function backfillArticleLocations(options: {
  limit?: number;
  dryRun?: boolean;
  testPrefix?: string;
}): Promise<BackfillResult> {
  const db = getAdminDb();
  const limit = options.limit ?? 100;
  const result: BackfillResult = {
    processed: 0,
    updated: 0,
    skippedReviewed: 0,
    highConfidence: 0,
    needsReview: 0,
    national: 0,
    international: 0,
    unknown: 0,
    errors: [],
  };

  const snap = await db
    .collection("news")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    result.processed += 1;

    if (data.locationReviewed === true) {
      result.skippedReviewed += 1;
      continue;
    }

    const titleEn = String(data.titleEn || "");
    if (options.testPrefix && !titleEn.startsWith(options.testPrefix)) continue;

    try {
      const geo = detectArticleLocation({
        titleHi: String(data.titleHi || ""),
        titleEn,
        summaryHi: String(data.summaryHi || ""),
        summaryEn: String(data.summaryEn || ""),
        categoryId: String(data.categoryId || ""),
        sourceName: String(data.sourceName || ""),
      });

      if (geo.geoScope === "international") result.international += 1;
      else if (geo.geoScope === "national") result.national += 1;
      else if (geo.geoConfidence >= 85) result.highConfidence += 1;
      else if (geo.geoConfidence >= 65) result.needsReview += 1;
      else result.unknown += 1;

      if (!options.dryRun) {
        await doc.ref.set(geoFieldsToFirestore(geo), { merge: true });
        result.updated += 1;
      }
    } catch (e) {
      result.errors.push(`${doc.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await db.collection("locationMigrationReports").add({
    ...result,
    dryRun: Boolean(options.dryRun),
    createdAt: new Date().toISOString(),
  });

  return result;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function commitBatches(
  db: ReturnType<typeof getAdminDb>,
  collection: string,
  items: Record<string, unknown>[],
  idField = "id"
) {
  const BATCH = 450;
  let written = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = db.batch();
    const chunk = items.slice(i, i + BATCH);
    for (const item of chunk) {
      const id = String(item[idField]);
      batch.set(
        db.collection(collection).doc(id),
        stripUndefined({ ...item, updatedAt: new Date().toISOString() }),
        { merge: true }
      );
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

export async function seedLocationsToFirestore(): Promise<{
  states: number;
  districts: number;
  cities: number;
}> {
  const states = await seedLocationPhase("states");
  const districts = await seedLocationPhase("districts");
  const cities = await seedLocationPhase("cities");

  await getAdminDb().collection("locationImportReports").add({
    type: "seed",
    states: states.written,
    districts: districts.written,
    cities: cities.written,
    dataset: getLocationDatasetMeta(),
    createdAt: new Date().toISOString(),
  });

  return {
    states: states.written,
    districts: districts.written,
    cities: cities.written,
  };
}

export type LocationSeedPhase = "states" | "districts" | "cities";

export async function seedLocationPhase(
  phase: LocationSeedPhase,
  offset = 0,
  limit = 200
): Promise<{ phase: LocationSeedPhase; written: number; total: number; done: boolean; nextOffset: number }> {
  const db = getAdminDb();

  if (phase === "states") {
    const items = INDIA_STATES.map((s) => ({ ...s }));
    const written = await commitBatches(db, "states", items);
    return { phase, written, total: items.length, done: true, nextOffset: items.length };
  }

  if (phase === "districts") {
    const all = getAllDistricts().map((d) => ({ ...d }));
    const slice = all.slice(offset, offset + limit);
    const written = slice.length ? await commitBatches(db, "districts", slice) : 0;
    const nextOffset = offset + slice.length;
    return { phase, written, total: all.length, done: nextOffset >= all.length, nextOffset };
  }

  const all = getAllCities().map((c) => ({ ...c }));
  const slice = all.slice(offset, offset + limit);
  const written = slice.length ? await commitBatches(db, "cities", slice) : 0;
  const nextOffset = offset + slice.length;
  return { phase, written, total: all.length, done: nextOffset >= all.length, nextOffset };
}
