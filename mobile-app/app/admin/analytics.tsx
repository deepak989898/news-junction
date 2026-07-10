import { ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAnalyticsSnapshot } from "@/hooks/useAdmin";

function Block({ title, value }: { title: string; value: string }) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <AppText className="font-semibold">{title}</AppText>
      <AppText className="mt-2 text-xs text-slate-600">{value}</AppText>
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const analytics = useAnalyticsSnapshot();
  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Analytics Dashboard" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <Block title="Visitors / Page Views" value={JSON.stringify(analytics.data?.summary || {}).slice(0, 700)} />
        <Block title="Top Articles / Keywords" value={JSON.stringify(analytics.data?.contentPerformance || {}).slice(0, 700)} />
        <Block title="AI Usage" value={JSON.stringify(analytics.data?.usage || {}).slice(0, 700)} />
        <Block title="Trend Discovery" value={JSON.stringify(analytics.data?.trendDiscovery || {}).slice(0, 700)} />
        <Block title="Revenue Placeholder" value="Revenue dashboard is read-only placeholder in mobile phase." />
      </ScrollView>
    </View>
  );
}
