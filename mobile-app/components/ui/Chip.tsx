import { Pressable } from "react-native";
import { AppText } from "./AppText";

export function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="rounded-full border border-slate-300 px-3 py-1">
      <AppText className="text-xs">{label}</AppText>
    </Pressable>
  );
}
