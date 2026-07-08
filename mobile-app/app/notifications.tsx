import { useEffect, useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/states";
import { useI18n } from "@/hooks/useI18n";
import { getNotificationHistory, saveNotificationHistory } from "@/services/storage/reader-storage";
import { AppNotificationItem } from "@/types/personalization";
import { router } from "expo-router";

export default function NotificationsScreen() {
  const { t } = useI18n();
  const [items, setItems] = useState<AppNotificationItem[]>([]);

  useEffect(() => {
    getNotificationHistory().then(setItems);
  }, []);

  const markRead = async (id: string) => {
    const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    setItems(next);
    await saveNotificationHistory(next);
  };

  const remove = async (id: string) => {
    const next = items.filter((n) => n.id !== id);
    setItems(next);
    await saveNotificationHistory(next);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("notifications")} />
      {items.length ? (
        <ScrollView className="px-4 pt-4">
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                markRead(item.id);
                if (item.slug) router.push(`/article/${item.slug}`);
              }}
              className={`mb-3 rounded-2xl p-4 ${item.read ? "bg-white" : "bg-red-50"}`}
            >
              <AppText className="text-xs uppercase text-red-600">{item.type}</AppText>
              <AppText className="mt-1 font-semibold">{item.title}</AppText>
              <AppText className="mt-1 text-sm text-slate-600">{item.body}</AppText>
              <Pressable onPress={() => remove(item.id)} className="mt-2">
                <AppText className="text-xs text-red-600">{t("delete")}</AppText>
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <EmptyState title={t("noNotifications")} subtitle={t("noNotificationsHint")} />
      )}
    </View>
  );
}
