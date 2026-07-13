import "server-only";

import { INDIA_CITIES_TIER1 } from "./data/india-cities-tier1";
import districtsBundle from "./data/india-districts.json";
import citiesGeneratedBundle from "./data/india-cities-generated.json";
import { IndiaCity, IndiaDistrict } from "./types";

interface DistrictsFile {
  meta: Record<string, unknown>;
  districts: (IndiaDistrict & { headquarters?: string })[];
}

interface CitiesFile {
  meta: Record<string, unknown>;
  cities: (IndiaCity & { isHeadquarters?: boolean })[];
}

let registry: {
  districts: IndiaDistrict[];
  cities: IndiaCity[];
  districtById: Map<string, IndiaDistrict>;
  cityById: Map<string, IndiaCity>;
  districtsByState: Map<string, IndiaDistrict[]>;
  citiesByState: Map<string, IndiaCity[]>;
  citiesByDistrict: Map<string, IndiaCity[]>;
} | null = null;

function mergeCities(generated: IndiaCity[], tier1: IndiaCity[]): IndiaCity[] {
  const byId = new Map<string, IndiaCity>();
  for (const c of generated) byId.set(c.id, c);
  for (const c of tier1) byId.set(c.id, c);
  return [...byId.values()];
}

export function getLocationRegistry() {
  if (registry) return registry;

  const districtFile = districtsBundle as DistrictsFile;
  const citiesFile = citiesGeneratedBundle as CitiesFile;

  const districts: IndiaDistrict[] = (districtFile.districts || []).map((d) => ({
    id: d.id,
    stateId: d.stateId,
    nameHi: d.nameHi,
    nameEn: d.nameEn,
    slug: d.slug,
    isActive: d.isActive !== false,
    latitude: d.latitude,
    longitude: d.longitude,
  }));

  const cities = mergeCities(citiesFile.cities || [], INDIA_CITIES_TIER1);

  const districtById = new Map(districts.map((d) => [d.id, d]));
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const districtsByState = new Map<string, IndiaDistrict[]>();
  const citiesByState = new Map<string, IndiaCity[]>();
  const citiesByDistrict = new Map<string, IndiaCity[]>();

  for (const d of districts) {
    const list = districtsByState.get(d.stateId) || [];
    list.push(d);
    districtsByState.set(d.stateId, list);
  }
  for (const stateId of districtsByState.keys()) {
    districtsByState.get(stateId)!.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }

  for (const c of cities) {
    const sList = citiesByState.get(c.stateId) || [];
    sList.push(c);
    citiesByState.set(c.stateId, sList);

    const dList = citiesByDistrict.get(c.districtId) || [];
    dList.push(c);
    citiesByDistrict.set(c.districtId, dList);
  }
  for (const stateId of citiesByState.keys()) {
    citiesByState.get(stateId)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  registry = {
    districts,
    cities,
    districtById,
    cityById,
    districtsByState,
    citiesByState,
    citiesByDistrict,
  };
  return registry;
}

export function getAllDistricts(): IndiaDistrict[] {
  return getLocationRegistry().districts;
}

export function getDistrictById(id: string): IndiaDistrict | undefined {
  return getLocationRegistry().districtById.get(id);
}

export function getDistrictBySlug(slug: string, stateId?: string): IndiaDistrict | undefined {
  return getLocationRegistry().districts.find(
    (d) => d.slug === slug && (!stateId || d.stateId === stateId)
  );
}

export function getDistrictsByState(stateId: string): IndiaDistrict[] {
  return getLocationRegistry().districtsByState.get(stateId) || [];
}

export function getAllCities(): IndiaCity[] {
  return getLocationRegistry().cities;
}

export function getCityById(id: string): IndiaCity | undefined {
  return getLocationRegistry().cityById.get(id);
}

export function getCityBySlug(slug: string): IndiaCity | undefined {
  return getLocationRegistry().cities.find((c) => c.slug === slug);
}

export function getCitiesByDistrict(districtId: string): IndiaCity[] {
  return getLocationRegistry().citiesByDistrict.get(districtId) || [];
}

export function getCitiesByState(stateId: string): IndiaCity[] {
  return getLocationRegistry().citiesByState.get(stateId) || [];
}

export function getNearbyCityIds(cityId: string): string[] {
  return getCityById(cityId)?.nearbyCityIds || [];
}

export function getLocationDatasetMeta() {
  const reg = getLocationRegistry();
  return {
    districtCount: reg.districts.length,
    cityCount: reg.cities.length,
    districtMeta: (districtsBundle as DistrictsFile).meta,
  };
}
