import { View } from "react-native";
import { AppText } from "./AppText";

export function Badge({ text }: { text: string }) {
  return (
    <View className="rounded-full bg-red-600 px-2 py-1">
      <AppText className="text-xs text-white">{text}</AppText>
    </View>
  );
}
