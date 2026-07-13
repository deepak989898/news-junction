import { getAdminDb } from "@/lib/firebase-admin";
import { getDailyNewsDistribution, DEFAULT_LOCAL_NEWS_SETTINGS } from "./quota";
import { INDIA_CITIES, INDIA_DISTRICTS } from "./data/india-locations";
import { INDIA_STATES } from "./data/india-states";
import { detectArticleLocation, geoFieldsToFirestore } from "./service";

export interface LocationCoverageReport {
  generatedAt: string;
  distribution: Awaited<ReturnType<typeof getDailyNewsDistribution>>;
  settings: typeof DEFAULT_LOCAL_NEWS_SETTINGS;
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
  for (const city of INDIA_CITIES.filter((c) => c.isActive)) {
    if (!citiesWithNewsSet.has(city.id)) emptyLocationPages.push(`/city/${city.slug}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    distribution,
    settings: DEFAULT_LOCAL_NEWS_SETTINGS,
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

export async function seedLocationsToFirestore(): Promise<{ states: number; districts: number; cities: number }> {
  const db = getAdminDb();
  const batch = db.batch();

  for (const s of INDIA_STATES) {
    batch.set(db.collection("states").doc(s.id), { ...s, updatedAt: new Date().toISOString() }, { merge: true });
  }
  for (const d of INDIA_DISTRICTS) {
    batch.set(db.collection("districts").doc(d.id), { ...d, updatedAt: new Date().toISOString() }, { merge: true });
  }
  for (const c of INDIA_CITIES) {
    batch.set(db.collection("cities").doc(c.id), { ...c, updatedAt: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();
  return { states: INDIA_STATES.length, districts: INDIA_DISTRICTS.length, cities: INDIA_CITIES.length };
}
