import { ArticleGeoFields } from "./types";

export function geoFieldsToFirestore(geo: ArticleGeoFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(geo)) {
    if (v !== undefined && v !== null && k !== "needsReview") out[k] = v;
  }
  return out;
}
