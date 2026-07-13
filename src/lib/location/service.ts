import { INDIA_CITIES, INDIA_DISTRICTS } from "./data/india-locations";
import { INDIA_STATES, INTERNATIONAL_MARKERS } from "./data/india-states";
import {
  ArticleGeoFields,
  GeoScope,
  IndiaCity,
  IndiaDistrict,
  IndiaState,
  LocationDetectionInput,
  LocationDetectionResult,
} from "./types";

export function getAllStates(): IndiaState[] {
  return INDIA_STATES.filter((s) => s.isActive);
}

export function getStateById(id: string): IndiaState | undefined {
  return INDIA_STATES.find((s) => s.id === id);
}

export function getStateBySlug(slug: string): IndiaState | undefined {
  return INDIA_STATES.find((s) => s.slug === slug);
}

export function getDistrictsByState(stateId: string): IndiaDistrict[] {
  return INDIA_DISTRICTS.filter((d) => d.stateId === stateId && d.isActive);
}

export function getDistrictById(id: string): IndiaDistrict | undefined {
  return INDIA_DISTRICTS.find((d) => d.id === id);
}

export function getDistrictBySlug(slug: string, stateId?: string): IndiaDistrict | undefined {
  return INDIA_DISTRICTS.find((d) => d.slug === slug && (!stateId || d.stateId === stateId));
}

export function getCitiesByDistrict(districtId: string): IndiaCity[] {
  return INDIA_CITIES.filter((c) => c.districtId === districtId && c.isActive);
}

export function getCitiesByState(stateId: string): IndiaCity[] {
  return INDIA_CITIES.filter((c) => c.stateId === stateId && c.isActive);
}

export function getCityById(id: string): IndiaCity | undefined {
  return INDIA_CITIES.find((c) => c.id === id);
}

export function getCityBySlug(slug: string): IndiaCity | undefined {
  return INDIA_CITIES.find((c) => c.slug === slug);
}

export function getNearbyCityIds(cityId: string): string[] {
  return getCityById(cityId)?.nearbyCityIds || [];
}

interface PlaceMatch {
  type: "city" | "district" | "state";
  confidence: number;
  city?: IndiaCity;
  district?: IndiaDistrict;
  state: IndiaState;
}

function findPlaceMatches(text: string): PlaceMatch[] {
  const lower = text.toLowerCase();
  const matches: PlaceMatch[] = [];

  for (const city of INDIA_CITIES) {
    const names = [city.nameEn.toLowerCase(), city.nameHi, city.slug.replace(/-/g, " ")];
    for (const name of names) {
      if (name && lower.includes(name.toLowerCase())) {
        const state = getStateById(city.stateId)!;
        const district = getDistrictById(city.districtId);
        matches.push({
          type: "city",
          confidence: name.length >= 5 ? 92 : 78,
          city,
          district,
          state,
        });
      }
    }
  }

  for (const district of INDIA_DISTRICTS) {
    const names = [district.nameEn.toLowerCase(), district.nameHi];
    for (const name of names) {
      if (name && lower.includes(name.toLowerCase())) {
        const state = getStateById(district.stateId)!;
        if (!matches.some((m) => m.district?.id === district.id)) {
          matches.push({ type: "district", confidence: 80, district, state });
        }
      }
    }
  }

  for (const state of INDIA_STATES) {
    const names = [state.nameEn.toLowerCase(), state.nameHi, state.slug.replace(/-/g, " ")];
    for (const name of names) {
      if (name.length > 3 && lower.includes(name.toLowerCase())) {
        if (!matches.some((m) => m.state.id === state.id && m.type !== "state")) {
          matches.push({ type: "state", confidence: 72, state });
        }
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect article location from content — NOT from source HQ alone.
 */
export function detectArticleLocation(input: LocationDetectionInput): LocationDetectionResult {
  const combined = `${input.titleHi} ${input.titleEn} ${input.summaryHi} ${input.summaryEn}`;
  const isInternationalCategory = input.categoryId === "duniya";
  const hasInternationalMarker = INTERNATIONAL_MARKERS.test(combined);

  if (isInternationalCategory && hasInternationalMarker) {
    return {
      countryCode: "INT",
      countryNameHi: "अंतर्राष्ट्रीय",
      countryNameEn: "International",
      isIndiaNews: false,
      geoScope: "international",
      geoConfidence: 85,
      locationDetectedBy: "rules",
      locationReviewed: false,
      needsReview: false,
      primaryLocation: "International",
      locationKeywords: [],
    };
  }

  if (hasInternationalMarker && !/\b(india|indian|bharat|भारत|भारतीय|delhi|mumbai|modi)\b/i.test(combined)) {
    return {
      countryCode: "INT",
      countryNameHi: "अंतर्राष्ट्रीय",
      countryNameEn: "International",
      isIndiaNews: false,
      geoScope: "international",
      geoConfidence: 75,
      locationDetectedBy: "rules",
      locationReviewed: false,
      needsReview: true,
      primaryLocation: "International",
      locationKeywords: [],
    };
  }

  const matches = findPlaceMatches(combined);
  const best = matches[0];

  if (!best) {
    return {
      countryCode: "IN",
      countryNameHi: "भारत",
      countryNameEn: "India",
      isIndiaNews: true,
      geoScope: "national",
      geoConfidence: 55,
      locationDetectedBy: "rules",
      locationReviewed: false,
      needsReview: false,
      primaryLocation: "India",
      locationKeywords: ["India"],
      isLocalNews: false,
    };
  }

  let geoScope: GeoScope = "state";
  let geoConfidence = best.confidence;

  if (best.type === "city" && best.city && geoConfidence >= 65) {
    geoScope = "city";
  } else if (best.type === "district" && best.district && geoConfidence >= 65) {
    geoScope = "district";
  } else if (geoConfidence < 65) {
    geoScope = "national";
    geoConfidence = Math.min(geoConfidence, 60);
  }

  const isLocal = (["city", "district", "local"] as GeoScope[]).includes(geoScope);

  const result: LocationDetectionResult = {
    countryCode: "IN",
    countryNameHi: "भारत",
    countryNameEn: "India",
    isIndiaNews: true,
    geoScope,
    geoConfidence,
    stateId: best.state.id,
    stateNameHi: best.state.nameHi,
    stateNameEn: best.state.nameEn,
    stateSlug: best.state.slug,
    locationDetectedBy: "rules",
    locationReviewed: geoConfidence < 85,
    needsReview: geoConfidence >= 65 && geoConfidence < 85,
    isLocalNews: isLocal,
    locationKeywords: [best.state.nameEn],
    primaryLocation: best.state.nameEn,
  };

  if (best.district && geoScope !== "national") {
    result.districtId = best.district.id;
    result.districtNameHi = best.district.nameHi;
    result.districtNameEn = best.district.nameEn;
    result.districtSlug = best.district.slug;
    result.primaryLocation = best.district.nameEn;
    result.locationKeywords!.push(best.district.nameEn);
  }

  if (best.city && geoScope === "city") {
    result.cityId = best.city.id;
    result.cityNameHi = best.city.nameHi;
    result.cityNameEn = best.city.nameEn;
    result.citySlug = best.city.slug;
    result.primaryLocation = best.city.nameEn;
    result.locationKeywords!.push(best.city.nameEn);
  }

  return result;
}

export function geoFieldsToFirestore(geo: ArticleGeoFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(geo)) {
    if (v !== undefined && v !== null && k !== "needsReview") out[k] = v;
  }
  return out;
}
