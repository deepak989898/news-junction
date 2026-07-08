import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";

export default function HelpScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Help</AppText>
      <AppText className="mt-3 text-slate-600">Support placeholder. Contact options will be added later.</AppText>
    </View>
  );
}
