import { Pressable } from "react-native";
import { AppText } from "./AppText";

export function Chip({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full border px-3 py-1 ${active ? "border-red-600 bg-red-50" : "border-slate-300"}`}
    >
      <AppText className={`text-xs ${active ? "font-semibold text-red-600" : ""}`}>{label}</AppText>
    </Pressable>
  );
}
