import { ScrollView, View } from "react-native";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useDiagnosticsData } from "@/hooks/useRuntime";
import { useNetwork } from "@/providers/NetworkProvider";

function Box({ title, value }: { title: string; value: string }) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <AppText className="font-semibold">{title}</AppText>
      <AppText className="mt-2 text-xs text-slate-600">{value}</AppText>
    </View>
  );
}

export default function DiagnosticsScreen() {
  const diagnostics = useDiagnosticsData();
  const { online } = useNetwork();
  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Diagnostics" />
      <ScrollView className="px-4 pb-8">
        <Box title="Device" value={`${Device.brand || "-"} ${Device.modelName || "-"} (${Device.osName || "-"} ${Device.osVersion || "-"})`} />
        <Box title="App Version" value={`${Application.nativeApplicationVersion || "unknown"} (${Application.nativeBuildVersion || "-"})`} />
        <Box title="Network" value={online ? "Online" : "Offline"} />
        <Box title="Firebase/API Health" value={JSON.stringify(diagnostics.data?.health || {}).slice(0, 900)} />
        <Box title="Storage" value={JSON.stringify(diagnostics.data?.storage || {}).slice(0, 900)} />
        <Box title="Performance Metrics (recent)" value={JSON.stringify((diagnostics.data?.metrics || []).slice(0, 15)).slice(0, 1200)} />
        <Box title="Notification Token Status" value="Available via notification registration flow." />
      </ScrollView>
    </View>
  );
}
