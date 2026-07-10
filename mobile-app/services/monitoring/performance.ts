import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";
import { PerformanceMetric } from "@/types/runtime";

const KEY = "nj_perf_metrics";

async function read(): Promise<PerformanceMetric[]> {
  const raw = await getStorageItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PerformanceMetric[];
  } catch {
    return [];
  }
}

export async function trackMetric(metric: Omit<PerformanceMetric, "at">) {
  const current = await read();
  const next: PerformanceMetric[] = [{ ...metric, at: new Date().toISOString() }, ...current].slice(0, 300);
  await setStorageItem(KEY, JSON.stringify(next));
}

export async function listMetrics() {
  return read();
}

export async function clearMetrics() {
  await setStorageItem(KEY, JSON.stringify([]));
}

export async function withMetric<T>(name: string, run: () => Promise<T>, meta?: Record<string, unknown>) {
  const start = Date.now();
  try {
    const result = await run();
    await trackMetric({ name, durationMs: Date.now() - start, meta });
    return result;
  } catch (error) {
    await trackMetric({ name: `${name}:error`, durationMs: Date.now() - start, meta });
    throw error;
  }
}
