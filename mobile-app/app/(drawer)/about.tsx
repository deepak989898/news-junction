import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { env } from "@/config/env";

export default function AboutScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">About</AppText>
      <AppText className="mt-3 text-slate-700">
        News Junction mobile foundation. Version {env.appVersion}
      </AppText>
    </View>
  );
}
