import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";

export default function CategoriesScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Categories Placeholder</AppText>
      <AppText className="mt-2 text-slate-600">Category listing and filter logic will be added in future phases.</AppText>
    </View>
  );
}
