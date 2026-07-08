import { View } from "react-native";
import { AppText } from "./AppText";

export function AppBar({ title }: { title: string }) {
  return (
    <View className="border-b border-slate-200 bg-white px-4 py-3">
      <AppText className="text-lg font-semibold">{title}</AppText>
    </View>
  );
}
