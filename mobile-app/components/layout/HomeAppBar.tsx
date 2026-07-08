import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";
import { useThemePreference } from "@/hooks/useThemePreference";

export function HomeAppBar() {
  const { t, language, setLanguage } = useI18n();
  const { resolvedTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";

  return (
    <View className={`border-b px-4 pb-3 pt-12 ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <View className="flex-row items-center justify-between">
        <View>
          <AppText className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{t("appName")}</AppText>
          <AppText className="text-xs text-red-600">{t("tagline")}</AppText>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push("/live")} accessibilityLabel="Live news">
            <Ionicons name="radio-outline" size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/search")} accessibilityLabel="Search">
            <Ionicons name="search-outline" size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
          </Pressable>
          <Pressable
            onPress={() => setLanguage(language === "hi" ? "en" : "hi")}
            accessibilityLabel="Switch language"
          >
            <AppText className="text-xs font-semibold text-red-600">{language === "hi" ? "EN" : "हिं"}</AppText>
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={isDark ? "#f8fafc" : "#0f172a"} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
