import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";

export default function TermsScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Terms</AppText>
      <AppText className="mt-3 text-slate-600">Terms placeholder for mobile app foundation.</AppText>
    </View>
  );
}
