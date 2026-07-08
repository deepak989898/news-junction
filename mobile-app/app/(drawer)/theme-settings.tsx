import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { useThemePreference } from "@/hooks/useThemePreference";

export default function ThemeSettingsScreen() {
  const { theme, setTheme, resolvedTheme } = useThemePreference();
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Theme Settings</AppText>
      <AppText className="mt-2 text-slate-600">Theme: {theme} · resolved: {resolvedTheme}</AppText>
      <View className="mt-3 gap-3">
        <AppButton title="Light" onPress={() => setTheme("light")} />
        <AppButton title="Dark" className="bg-slate-700" onPress={() => setTheme("dark")} />
        <AppButton title="System" className="bg-red-600" onPress={() => setTheme("system")} />
      </View>
    </View>
  );
}
