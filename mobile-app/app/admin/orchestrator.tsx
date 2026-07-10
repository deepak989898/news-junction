import { Alert, ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminProfile, useOrchestratorActions, useOrchestratorSnapshot } from "@/hooks/useAdmin";

export default function AdminOrchestratorScreen() {
  const snapshot = useOrchestratorSnapshot();
  const actions = useOrchestratorActions();
  const profile = useAdminProfile();
  const isSuperAdmin = profile.data?.role === "super_admin";

  const runCritical = (action: "emergency_pause" | "emergency_resume") => {
    if (!isSuperAdmin) return;
    Alert.alert("Confirm critical action", action, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: () => actions.mutate({ action }) },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Orchestrator" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Automation Controls</AppText>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <AppButton title="Run Workflow" onPress={() => actions.mutate({ action: "run_workflow", workflowId: "default" })} />
            <AppButton title="Retry Failed" onPress={() => actions.mutate({ action: "retry_failed", workflowId: "default" })} />
            <AppButton title="Pause Queue" onPress={() => actions.mutate({ action: "emergency_pause" })} />
            <AppButton title="Resume Queue" onPress={() => actions.mutate({ action: "emergency_resume" })} />
            {isSuperAdmin ? (
              <AppButton title="Emergency Pause" className="bg-red-700" onPress={() => runCritical("emergency_pause")} />
            ) : null}
          </View>
        </View>
        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Workflow Logs</AppText>
          <AppText className="mt-2 text-xs text-slate-600">{JSON.stringify(snapshot.data?.history || {}).slice(0, 1200)}</AppText>
        </View>
      </ScrollView>
    </View>
  );
}
