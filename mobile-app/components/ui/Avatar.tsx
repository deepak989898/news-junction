import { View } from "react-native";
import { AppText } from "./AppText";

export function Avatar({ label = "U" }: { label?: string }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
      <AppText className="font-semibold">{label.slice(0, 1).toUpperCase()}</AppText>
    </View>
  );
}
