import { ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminProfile, useAdminUserActions, useAdminUsers } from "@/hooks/useAdmin";

export default function AdminUsersScreen() {
  const profile = useAdminProfile();
  const users = useAdminUsers();
  const action = useAdminUserActions();
  const isSuperAdmin = profile.data?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <View className="flex-1 bg-slate-50">
        <AppBar title="User Management" />
        <AdminNav />
        <View className="flex-1 items-center justify-center px-6">
          <AppText className="text-center">Only super admin can manage users.</AppText>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="User Management" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        {(users.data || []).map((u, idx) => (
          <View key={`${idx}-${String(u.id || "")}`} className="mb-2 rounded-2xl bg-white p-4">
            <AppText className="font-semibold">{String(u.name || u.email || u.id)}</AppText>
            <AppText className="mt-1 text-xs text-slate-500">Role: {String(u.role || "viewer")} · Status: {String(u.status || "active")}</AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <AppButton title="Enable" onPress={() => action.mutate({ uid: String(u.id), status: "active" })} />
              <AppButton title="Disable" onPress={() => action.mutate({ uid: String(u.id), status: "disabled" })} />
              <AppButton title="Set Editor" onPress={() => action.mutate({ uid: String(u.id), role: "editor" })} />
              <AppButton title="Set Moderator" onPress={() => action.mutate({ uid: String(u.id), role: "moderator" })} />
              <AppButton title="Set Viewer" onPress={() => action.mutate({ uid: String(u.id), role: "viewer" })} />
              <AppButton title="Reset Password" className="bg-red-700" onPress={() => {}} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
