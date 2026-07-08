import { Switch, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useReaderSettings } from "@/providers/ReaderSettingsProvider";
import { useI18n } from "@/hooks/useI18n";

export default function AccessibilitySettingsScreen() {
  const { t } = useI18n();
  const { reduceMotion, highContrast, setReduceMotion, setHighContrast } = useReaderSettings();

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("accessibility")} />
      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("largeFonts")}</AppText>
          <AppText className="text-slate-500">{t("useFontSizeSetting")}</AppText>
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("reduceMotion")}</AppText>
          <Switch value={reduceMotion} onValueChange={setReduceMotion} />
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
          <AppText>{t("highContrast")}</AppText>
          <Switch value={highContrast} onValueChange={setHighContrast} />
        </View>
        <View className="rounded-2xl bg-white px-4 py-4">
          <AppText>{t("screenReaderHint")}</AppText>
        </View>
      </View>
    </View>
  );
}
