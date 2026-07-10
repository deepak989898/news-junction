import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { listOfflineAdminActions, removeOfflineAdminAction } from "@/services/offline/admin-queue";
import { OfflineAdminAction } from "@/types/admin";
import { apiFetch } from "@/services/api/client";
import { useNetwork } from "@/providers/NetworkProvider";

export default function AdminOfflineQueueScreen() {
  const [items, setItems] = useState<OfflineAdminAction[]>([]);
  const { online } = useNetwork();

  const load = () => listOfflineAdminActions().then(setItems);

  useEffect(() => {
    load();
  }, []);

  const retry = async (item: OfflineAdminAction) => {
    if (!online) return;
    await apiFetch(item.endpoint, { method: item.method, body: item.payload });
    await removeOfflineAdminAction(item.id);
    load();
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Offline Queue" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <AppText className="mb-3 text-sm text-slate-600">
          Offline mode {online ? "online now" : "active"} · publishing remains blocked while offline.
        </AppText>
        {items.map((item) => (
          <View key={item.id} className="mb-2 rounded-2xl bg-white p-4">
            <AppText className="font-semibold">{item.method} {item.endpoint}</AppText>
            <AppText className="mt-1 text-xs text-slate-500">{item.createdAt}</AppText>
            <View className="mt-3 flex-row gap-2">
              <AppButton title="Retry" onPress={() => retry(item)} />
              <AppButton title="Remove" className="bg-red-700" onPress={() => removeOfflineAdminAction(item.id).then(load)} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
