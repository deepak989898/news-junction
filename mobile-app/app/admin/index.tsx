import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminDashboard, useAdminProfile } from "@/hooks/useAdmin";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="mb-2 w-[48%] rounded-2xl bg-white p-4">
      <AppText className="text-xs text-slate-500">{label}</AppText>
      <AppText className="mt-1 text-xl font-bold text-slate-900">{value}</AppText>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const dashboard = useAdminDashboard();
  const profile = useAdminProfile();
  const data = dashboard.data;

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Admin Dashboard" />
      <AdminNav />
      <ScrollView className="px-4">
        <View className="mb-4 rounded-2xl bg-slate-900 p-4">
          <AppText className="text-xs uppercase text-red-300">News Junction Enterprise</AppText>
          <AppText className="mt-1 text-lg font-bold text-white">
            {profile.data?.role === "super_admin" ? "Super Admin" : profile.data?.role || "Admin"}
          </AppText>
          <AppText className="mt-1 text-sm text-slate-300">{profile.data?.email || ""}</AppText>
        </View>

        <View className="mb-4 flex-row flex-wrap justify-between">
          <MetricCard label="Today's Published" value={data?.publishedToday ?? 0} />
          <MetricCard label="Draft Articles" value={data?.drafts ?? 0} />
          <MetricCard label="Pending AI Reviews" value={data?.pendingAiReviews ?? 0} />
          <MetricCard label="Editorial Reviews" value={data?.pendingEditorialReviews ?? 0} />
          <MetricCard label="Media Queue" value={data?.pendingMediaGeneration ?? 0} />
          <MetricCard label="Social Queue" value={data?.pendingSocialPosts ?? 0} />
          <MetricCard label="Push Queue" value={data?.pendingPushNotifications ?? 0} />
          <MetricCard label="AI Cost Today" value={data?.aiCostToday ?? 0} />
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4">
          <AppText className="text-base font-semibold">Quick Actions</AppText>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <AppButton title="Create News" onPress={() => router.push("/admin/articles")} />
            <AppButton title="Approve Article" onPress={() => router.push("/admin/articles")} />
            <AppButton title="Generate AI" onPress={() => router.push("/admin/ai-tools")} />
            <AppButton title="Media Queue" onPress={() => router.push("/admin/operations")} />
            <AppButton title="Push Notify" onPress={() => router.push("/admin/notifications")} />
            <AppButton title="View Analytics" onPress={() => router.push("/admin/analytics")} />
            {profile.data?.role === "super_admin" ? (
              <AppButton title="Emergency Stop" className="bg-red-700" onPress={() => router.push("/admin/orchestrator")} />
            ) : null}
          </View>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-4">
          <AppText className="text-base font-semibold">System Health</AppText>
          <AppText className="mt-2 text-sm text-slate-700">
            {data?.healthSummary ? JSON.stringify(data.healthSummary).slice(0, 220) : "No health data"}
          </AppText>
        </View>

        <View className="mb-8 rounded-2xl bg-white p-4">
          <AppText className="text-base font-semibold">Latest Activity</AppText>
          {(data?.latestActivity || []).slice(0, 10).map((item, idx) => (
            <AppText key={`${idx}-${String(item.id || "")}`} className="mt-2 text-xs text-slate-600">
              {String(item.titleEn || item.titleHi || item.id || "Activity")}
            </AppText>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
