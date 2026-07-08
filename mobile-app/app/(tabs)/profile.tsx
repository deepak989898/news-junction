import { View } from "react-native";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Profile</AppText>
      <AppText className="mt-2 text-slate-600">{user?.email || "No user"}</AppText>
      <AppButton title="Open Settings Drawer" className="mt-4" onPress={() => router.push("/(drawer)")} />
      <AppButton
        title="Logout"
        className="mt-3 bg-red-600"
        onPress={async () => {
          await logout();
          router.replace("/auth/login");
        }}
      />
    </View>
  );
}
