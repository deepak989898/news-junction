import { IndiaCity, IndiaDistrict, IndiaState } from "./types";

export interface LocationsApiResponse {
  states?: IndiaState[];
  districts?: IndiaDistrict[];
  cities?: IndiaCity[];
  meta?: Record<string, unknown>;
}

export async function fetchLocationStates(): Promise<IndiaState[]> {
  const res = await fetch("/api/locations?resource=states");
  if (!res.ok) throw new Error("Failed to load states");
  const data = (await res.json()) as LocationsApiResponse;
  return data.states || [];
}

export async function fetchDistrictsByState(stateId: string): Promise<IndiaDistrict[]> {
  const res = await fetch(`/api/locations/districts?stateId=${encodeURIComponent(stateId)}`);
  if (!res.ok) throw new Error("Failed to load districts");
  const data = (await res.json()) as LocationsApiResponse;
  return data.districts || [];
}

export async function fetchCitiesByState(stateId: string, districtId?: string): Promise<IndiaCity[]> {
  const params = new URLSearchParams({ stateId });
  if (districtId) params.set("districtId", districtId);
  const res = await fetch(`/api/locations/cities?${params}`);
  if (!res.ok) throw new Error("Failed to load cities");
  const data = (await res.json()) as LocationsApiResponse;
  return data.cities || [];
}

export async function fetchCitiesByDistrict(districtId: string): Promise<IndiaCity[]> {
  const res = await fetch(`/api/locations/cities?districtId=${encodeURIComponent(districtId)}`);
  if (!res.ok) throw new Error("Failed to load cities");
  const data = (await res.json()) as LocationsApiResponse;
  return data.cities || [];
}
