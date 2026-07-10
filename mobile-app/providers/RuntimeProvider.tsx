import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useUpdateStatus, useFeatureFlags, useRuntimeConfig } from "@/hooks/useRuntime";
import { openStorePage } from "@/services/runtime/versioning";
import { Alert } from "react-native";

type RuntimeContextValue = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  featureFlags: Record<string, boolean>;
};

const RuntimeContext = createContext<RuntimeContextValue>({
  maintenanceEnabled: false,
  maintenanceMessage: "",
  featureFlags: {},
});

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const config = useRuntimeConfig();
  const flags = useFeatureFlags();
  const updates = useUpdateStatus();
  const [skippedVersion, setSkippedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!updates.data) return;
    const { update, config: cfg } = updates.data;
    if (update.force) {
      Alert.alert("Update required", cfg.releaseNotes || "Please update to continue.", [
        { text: "Update", onPress: () => openStorePage() },
      ]);
      return;
    }
    if (update.optional && skippedVersion !== cfg.latestVersion) {
      Alert.alert("Update available", cfg.releaseNotes || "A newer version is available.", [
        { text: "Skip", onPress: () => setSkippedVersion(cfg.latestVersion) },
        { text: "Update", onPress: () => openStorePage() },
      ]);
    }
  }, [updates.data, skippedVersion]);

  const value = useMemo<RuntimeContextValue>(
    () => ({
      maintenanceEnabled: Boolean(config.data?.maintenanceEnabled || config.data?.emergencyDisable),
      maintenanceMessage: config.data?.maintenanceMessage || "",
      featureFlags: flags.data || {},
    }),
    [config.data, flags.data]
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime() {
  return useContext(RuntimeContext);
}
