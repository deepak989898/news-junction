/** Client-safe state helpers + shared geo serialization */
export {
  getAllStates,
  getStateById,
  getStateBySlug,
  getStateByCode,
  INDIA_STATES,
} from "./states";

export { geoFieldsToFirestore } from "./geo-firestore";

export type {
  GeoScope,
  IndiaState,
  IndiaDistrict,
  IndiaCity,
  UserPreferredLocation,
  ArticleGeoFields,
  LocationDetectionResult,
} from "./types";
