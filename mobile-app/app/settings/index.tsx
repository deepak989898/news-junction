import { ScrollView, Switch, View, Pressable } from "react-native";
import { router } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";
import { useThemePreference } from "@/hooks/useThemePreference";
import { useReaderSettings } from "@/providers/ReaderSettingsProvider";
import { Ionicons } from "@expo/vector-icons";

function Row({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
      <AppText>{label}</AppText>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export default function SettingsIndexScreen() {
  const { t, language, setLanguage } = useI18n();
  const { theme, setTheme } = useThemePreference();
  const reader = useReaderSettings();

  const links = [
    { label: t("fontSize"), href: "/settings/font-size" },
    { label: t("accessibility"), href: "/settings/accessibility" },
    { label: t("dataSaver"), href: "/settings/data-saver" },
    { label: t("notificationSettings"), href: "/settings/notifications" },
    { label: t("about"), href: "/(drawer)/about" },
    { label: t("privacy"), href: "/(drawer)/privacy" },
    { label: t("terms"), href: "/(drawer)/terms" },
    { label: t("licenses"), href: "/settings/licenses" },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("settings")} />
      <ScrollView className="px-4 pt-4">
        <AppText className="mb-2 font-semibold">{t("language")}</AppText>
        <View className="mb-4 flex-row gap-2">
          <Pressable onPress={() => setLanguage("en")} className={`rounded-xl px-4 py-2 ${language === "en" ? "bg-red-600" : "bg-white"}`}>
            <AppText className={language === "en" ? "text-white" : ""}>English</AppText>
          </Pressable>
          <Pressable onPress={() => setLanguage("hi")} className={`rounded-xl px-4 py-2 ${language === "hi" ? "bg-red-600" : "bg-white"}`}>
            <AppText className={language === "hi" ? "text-white" : ""}>हिंदी</AppText>
          </Pressable>
        </View>

        <AppText className="mb-2 font-semibold">{t("theme")}</AppText>
        <View className="mb-4 flex-row gap-2">
          {(["light", "dark", "system"] as const).map((opt) => (
            <Pressable key={opt} onPress={() => setTheme(opt)} className={`rounded-xl px-4 py-2 ${theme === opt ? "bg-red-600" : "bg-white"}`}>
              <AppText className={theme === opt ? "text-white" : ""}>{opt}</AppText>
            </Pressable>
          ))}
        </View>

        <Row label={t("dataSaver")} value={reader.dataSaver} onValueChange={reader.setDataSaver} />
        <Row label={t("autoDownload")} value={reader.autoDownload} onValueChange={reader.setAutoDownload} />
        <Row label={t("wifiOnlyDownloads")} value={reader.wifiOnlyDownloads} onValueChange={reader.setWifiOnlyDownloads} />
        <Row label={t("lowImageMode")} value={reader.lowImageMode} onValueChange={reader.setLowImageMode} />

        {links.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => router.push(link.href as never)}
            className="mb-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-4"
          >
            <AppText>{link.label}</AppText>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
