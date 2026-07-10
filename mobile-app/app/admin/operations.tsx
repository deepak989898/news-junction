import { ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AdminNav } from "@/components/admin/AdminNav";
import { useOperationsSnapshot } from "@/hooks/useAdmin";

function Box({ title, value }: { title: string; value: string }) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <AppText className="font-semibold">{title}</AppText>
      <AppText className="mt-2 text-xs text-slate-600">{value}</AppText>
    </View>
  );
}

export default function AdminOperationsScreen() {
  const q = useOperationsSnapshot();
  const data = q.data;

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Operations Center" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <Box title="System Health" value={JSON.stringify(data?.health || {}).slice(0, 700)} />
        <Box title="Queue Status" value={JSON.stringify(data?.queues || {}).slice(0, 700)} />
        <Box title="Cron Status" value={JSON.stringify(data?.cron || {}).slice(0, 700)} />
        <Box title="Cost & Usage" value={JSON.stringify(data?.cost || {}).slice(0, 700)} />
        <Box title="Errors" value={JSON.stringify(data?.errors || {}).slice(0, 700)} />
      </ScrollView>
    </View>
  );
}
