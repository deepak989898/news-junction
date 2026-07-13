import "server-only";

import {
  getAllCities,
  getAllDistricts,
  getCityById,
  getDistrictById,
  getDistrictsByState,
} from "./district-registry";
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
import { getStateById } from "./states";

export {
  getAllDistricts,
  getDistrictById,
  getDistrictsByState,
  getAllCities,
  getCityById,
  getCitiesByDistrict,
  getCitiesByState,
  getCityBySlug,
  getDistrictBySlug,
  getNearbyCityIds,
  getLocationDatasetMeta,
} from "./district-registry";

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

  for (const city of getAllCities()) {
    const names = [city.nameEn.toLowerCase(), city.nameHi, city.slug.replace(/-/g, " ")];
    for (const name of names) {
      if (name && name.length >= 3 && lower.includes(name.toLowerCase())) {
        const state = getStateById(city.stateId)!;
        const district = getDistrictById(city.districtId);
        if (!state) continue;
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

  for (const district of getAllDistricts()) {
    const names = [district.nameEn.toLowerCase(), district.nameHi];
    for (const name of names) {
      if (name && name.length >= 4 && lower.includes(name.toLowerCase())) {
        const state = getStateById(district.stateId)!;
        if (!state) continue;
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

export { geoFieldsToFirestore } from "./geo-firestore";
