export type GeoScope = "local" | "city" | "district" | "state" | "national" | "international";

export interface IndiaState {
  id: string;
  code: string;
  nameHi: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
}

export interface IndiaDistrict {
  id: string;
  stateId: string;
  nameHi: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
}

export interface IndiaCity {
  id: string;
  districtId: string;
  stateId: string;
  nameHi: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  nearbyCityIds: string[];
  priority: number;
}

export interface ArticleGeoFields {
  countryCode: string;
  countryNameHi: string;
  countryNameEn: string;
  isIndiaNews: boolean;
  geoScope: GeoScope;
  stateId?: string;
  stateNameHi?: string;
  stateNameEn?: string;
  stateSlug?: string;
  districtId?: string;
  districtNameHi?: string;
  districtNameEn?: string;
  districtSlug?: string;
  cityId?: string;
  cityNameHi?: string;
  cityNameEn?: string;
  citySlug?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  geoConfidence: number;
  primaryLocation?: string;
  relatedLocationIds?: string[];
  locationKeywords?: string[];
  isLocalNews?: boolean;
  locationDetectedBy?: "rules" | "ai" | "manual" | "source";
  locationReviewed?: boolean;
}

export interface UserPreferredLocation {
  stateId: string;
  districtId?: string;
  cityId?: string;
  selectedAt: string;
  source: "manual" | "browser";
  preferredLanguage?: "hi" | "en";
}

export interface LocalNewsSettings {
  indiaNewsPercentageTarget: number;
  internationalNewsPercentageMaximum: number;
  nationalAllocationPercent: number;
  stateAllocationPercent: number;
  localAllocationPercent: number;
  minimumCategoryCoverage: Record<string, number>;
}

export interface LocationDetectionInput {
  titleHi: string;
  titleEn: string;
  summaryHi: string;
  summaryEn: string;
  categoryId: string;
  sourceName?: string;
  /** Source HQ location — must NOT override story location */
  sourceStateId?: string;
}

export interface LocationDetectionResult extends ArticleGeoFields {
  needsReview: boolean;
}
