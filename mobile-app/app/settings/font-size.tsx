import { View, Pressable } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { useReaderSettings, FontSize } from "@/providers/ReaderSettingsProvider";
import { useI18n } from "@/hooks/useI18n";

export default function FontSizeSettingsScreen() {
  const { t } = useI18n();
  const { fontSize, setFontSize } = useReaderSettings();
  const options: FontSize[] = ["small", "medium", "large"];

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("fontSize")} />
      <View className="gap-2 p-4">
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => setFontSize(opt)}
            className={`rounded-2xl px-4 py-4 ${fontSize === opt ? "bg-red-600" : "bg-white"}`}
          >
            <AppText className={fontSize === opt ? "text-white" : ""}>{opt}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
