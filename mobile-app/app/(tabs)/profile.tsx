import { ScrollView, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useThemePreference } from "@/hooks/useThemePreference";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, language } = useI18n();
  const { resolvedTheme } = useThemePreference();

  const rows = [
    { label: t("readingHistory"), href: "/reading-history" },
    { label: t("bookmarks"), href: "/(tabs)/bookmarks" },
    { label: t("notifications"), href: "/notifications" },
    { label: t("settings"), href: "/settings" },
    { label: t("about"), href: "/(drawer)/about" },
    { label: t("privacy"), href: "/(drawer)/privacy" },
    { label: t("terms"), href: "/(drawer)/terms" },
  ];

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center px-4 pb-6 pt-16">
        <Avatar label={user?.displayName || user?.email || "U"} />
        <AppText className="mt-3 text-xl font-bold">{user?.displayName || "Reader"}</AppText>
        <AppText className="mt-1 text-slate-500">{user?.email || t("guest")}</AppText>
        <AppText className="mt-2 text-sm text-slate-500">
          {t("language")}: {language === "hi" ? "हिंदी" : "English"}
        </AppText>
      </View>

      <View className="px-4">
        {rows.map((row) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href as never)}
            className="mb-2 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
          >
            <AppText className="font-medium">{row.label}</AppText>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </Pressable>
        ))}
        <AppButton
          title={t("logout")}
          className="mt-4 bg-red-600"
          onPress={async () => {
            await logout();
            router.replace("/auth/login");
          }}
        />
      </View>
    </ScrollView>
  );
}
