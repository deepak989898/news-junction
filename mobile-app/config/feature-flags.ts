import { env } from "./env";

export function getFeatureFlags() {
  try {
    return JSON.parse(env.featureFlags) as Record<string, boolean>;
  } catch {
    return {};
  }
}
