import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getStorageItem } from "@/services/storage/app-storage";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { View } from "react-native";
import { Loader } from "@/components/ui/Loader";

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    getStorageItem(STORAGE_KEYS.onboardingDone).then((v) => setOnboardingDone(v === "1"));
  }, []);

  if (loading || onboardingDone === null) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Loader />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)" />;
}
