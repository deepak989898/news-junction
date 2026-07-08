import { ScrollView, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";

export default function LicensesScreen() {
  const { t } = useI18n();
  const libs = ["Expo", "React Native", "Firebase", "TanStack Query", "FlashList", "Reanimated"];
  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("licenses")} />
      <ScrollView className="p-4">
        {libs.map((lib) => (
          <View key={lib} className="mb-2 rounded-2xl bg-white p-4">
            <AppText className="font-semibold">{lib}</AppText>
            <AppText className="mt-1 text-sm text-slate-500">Open-source license applies.</AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
