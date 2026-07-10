import { RuntimeConfig } from "@/types/runtime";

const DEFAULT_FLAGS: Record<string, boolean> = {
  aiCenter: true,
  adminCenter: true,
  diagnostics: true,
  performanceMetrics: true,
  crashReporting: true,
};

export function resolveFeatureFlags(config?: Partial<RuntimeConfig>) {
  const percent = Math.max(0, Math.min(100, Number(config?.featureRolloutPercent ?? 100)));
  const rolloutEnabled = percent >= 100 || Math.random() * 100 <= percent;
  const merged = { ...DEFAULT_FLAGS, ...(config?.featureFlags || {}) };
  if (!rolloutEnabled) {
    return Object.fromEntries(Object.keys(merged).map((k) => [k, false])) as Record<string, boolean>;
  }
  return merged;
}
