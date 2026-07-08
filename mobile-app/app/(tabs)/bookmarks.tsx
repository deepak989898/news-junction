import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";

export default function BookmarksScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Bookmarks Placeholder</AppText>
      <AppText className="mt-2 text-slate-600">Bookmark business logic is intentionally deferred.</AppText>
    </View>
  );
}
