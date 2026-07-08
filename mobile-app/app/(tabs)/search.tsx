import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppInput } from "@/components/ui/AppInput";

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Search Placeholder</AppText>
      <AppInput className="mt-4" placeholder="Search (foundation only)" />
      <AppText className="mt-2 text-slate-600">Search logic intentionally deferred to later phases.</AppText>
    </View>
  );
}
