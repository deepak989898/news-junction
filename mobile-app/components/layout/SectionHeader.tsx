import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { router } from "expo-router";

export function SectionHeader({
  title,
  actionLabel,
  href,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <View className="mb-3 mt-5 flex-row items-center justify-between px-4">
      <AppText className="text-lg font-bold text-slate-900">{title}</AppText>
      {actionLabel && href ? (
        <Pressable onPress={() => router.push(href as never)}>
          <AppText className="text-sm font-semibold text-red-600">{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
