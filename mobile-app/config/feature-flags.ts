import { env } from "./env";
import { resolveFeatureFlags } from "@/services/runtime/feature-flags";

export function getFeatureFlags() {
  try {
    const parsed = JSON.parse(env.featureFlags) as Record<string, boolean>;
    return resolveFeatureFlags({ featureFlags: parsed, featureRolloutPercent: 100 });
  } catch {
    return resolveFeatureFlags();
  }
}
