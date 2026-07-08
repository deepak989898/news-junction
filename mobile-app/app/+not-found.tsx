import { View } from "react-native";
import { Link } from "expo-router";
import { AppText } from "@/components/ui/AppText";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <AppText className="text-2xl font-bold">404</AppText>
      <AppText className="mt-2 text-slate-600">Screen not found.</AppText>
      <Link href="/" className="mt-4 text-red-600">Go Home</Link>
    </View>
  );
}
