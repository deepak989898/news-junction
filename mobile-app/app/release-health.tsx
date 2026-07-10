import { Alert, ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { useRuntimeHealth, useUpdateStatus, useCheckForOtaUpdate } from "@/hooks/useRuntime";
import { openStorePage } from "@/services/runtime/versioning";

export default function ReleaseHealthScreen() {
  const health = useRuntimeHealth();
  const update = useUpdateStatus();
  const ota = useCheckForOtaUpdate();
  const force = update.data?.update.force;
  const optional = update.data?.update.optional;

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="App Health Dashboard" />
      <ScrollView className="px-4 pb-8">
        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Version</AppText>
          <AppText className="mt-1 text-sm text-slate-600">Current: {update.data?.update.current || "-"}</AppText>
          <AppText className="mt-1 text-sm text-slate-600">Latest: {update.data?.config.latestVersion || "-"}</AppText>
          <AppText className="mt-1 text-sm text-slate-600">Minimum: {update.data?.config.minimumVersion || "-"}</AppText>
          <AppText className="mt-2 text-sm text-red-600">{force ? "Force update required" : optional ? "Optional update available" : "App up to date"}</AppText>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <AppButton title="Open Store" onPress={() => openStorePage()} />
            <AppButton
              title="Check OTA"
              onPress={async () => {
                try {
                  const result = await ota.mutateAsync();
                  Alert.alert("OTA Check", result.isAvailable ? "Update available" : "No OTA update");
                } catch {
                  Alert.alert("OTA Check", "Unable to check update right now.");
                }
              }}
            />
          </View>
        </View>

        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">System Status</AppText>
          <AppText className="mt-2 text-xs text-slate-600">{JSON.stringify(health.data || {}).slice(0, 1500)}</AppText>
        </View>
      </ScrollView>
    </View>
  );
}
