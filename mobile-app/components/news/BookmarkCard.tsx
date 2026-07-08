import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { UserBookmarkItem } from "@/types/personalization";
import { AppText } from "@/components/ui/AppText";

export function BookmarkCard({ item, onRemove }: { item: UserBookmarkItem; onRemove?: () => void }) {
  return (
    <Pressable
      onPress={() => router.push(`/article/${item.slug}`)}
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <AppText numberOfLines={2} className="font-semibold text-slate-900">
        {item.title}
      </AppText>
      <View className="mt-2 flex-row items-center justify-between">
        <AppText className="text-xs text-slate-500">{item.categoryName || "News"}</AppText>
        {onRemove ? (
          <Pressable onPress={onRemove}>
            <AppText className="text-xs font-semibold text-red-600">Remove</AppText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
