import { INDIA_STATES, INTERNATIONAL_MARKERS } from "./data/india-states";
import { IndiaState } from "./types";

export { INDIA_STATES, INTERNATIONAL_MARKERS };

export function getAllStates(): IndiaState[] {
  return INDIA_STATES.filter((s) => s.isActive);
}

export function getStateById(id: string): IndiaState | undefined {
  return INDIA_STATES.find((s) => s.id === id);
}

export function getStateBySlug(slug: string): IndiaState | undefined {
  return INDIA_STATES.find((s) => s.slug === slug);
}

export function getStateByCode(code: string): IndiaState | undefined {
  return INDIA_STATES.find((s) => s.code === code);
}
