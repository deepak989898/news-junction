import { useMutation, useQuery } from "@tanstack/react-query";
import * as Updates from "expo-updates";
import { getRuntimeConfigApi, getRuntimeHealthApi } from "@/services/api/runtime";
import { evaluateUpdate } from "@/services/runtime/versioning";
import { resolveFeatureFlags } from "@/services/runtime/feature-flags";
import { captureError } from "@/services/monitoring/crash-reporting";
import { getOfflineStorageUsage } from "@/services/offline/storage-stats";
import { listMetrics } from "@/services/monitoring/performance";

export function useRuntimeConfig() {
  return useQuery({
    queryKey: ["runtime-config"],
    queryFn: getRuntimeConfigApi,
    staleTime: 1000 * 60,
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["runtime-feature-flags"],
    queryFn: async () => {
      const config = await getRuntimeConfigApi();
      return resolveFeatureFlags(config);
    },
    staleTime: 1000 * 60,
  });
}

export function useUpdateStatus() {
  return useQuery({
    queryKey: ["runtime-update-status"],
    queryFn: async () => {
      const config = await getRuntimeConfigApi();
      return {
        config,
        update: evaluateUpdate(config),
      };
    },
    staleTime: 1000 * 60,
  });
}

export function useCheckForOtaUpdate() {
  return useMutation({
    mutationFn: async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        return result;
      } catch (error) {
        captureError(error, { scope: "ota-check" });
        throw error;
      }
    },
  });
}

export function useRuntimeHealth() {
  return useQuery({
    queryKey: ["runtime-health"],
    queryFn: getRuntimeHealthApi,
    refetchInterval: 60000,
  });
}

export function useDiagnosticsData() {
  return useQuery({
    queryKey: ["diagnostics-data"],
    queryFn: async () => {
      const [health, storage, metrics] = await Promise.all([
        getRuntimeHealthApi().catch(() => null),
        getOfflineStorageUsage().catch(() => null),
        listMetrics().catch(() => []),
      ]);
      return { health, storage, metrics };
    },
  });
}
