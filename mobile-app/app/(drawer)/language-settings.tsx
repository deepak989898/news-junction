import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { useI18n } from "@/hooks/useI18n";

export default function LanguageSettingsScreen() {
  const { language, setLanguage } = useI18n();
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Language Settings</AppText>
      <AppText className="mt-2 text-slate-600">Current: {language}</AppText>
      <View className="mt-3 gap-3">
        <AppButton title="English" onPress={() => setLanguage("en")} />
        <AppButton title="हिन्दी" className="bg-red-600" onPress={() => setLanguage("hi")} />
      </View>
    </View>
  );
}
