import { useState } from "react";
import { Dimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { setStorageItem } from "@/services/storage/app-storage";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { useI18n } from "@/hooks/useI18n";
import { requestNotificationPermission } from "@/services/permissions/permission-manager";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { language, setLanguage } = useI18n();

  const next = async () => {
    if (step === 2) await requestNotificationPermission();
    if (step >= 3) {
      await setStorageItem(STORAGE_KEYS.onboardingDone, "1");
      router.replace("/auth/login");
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      <Animated.View entering={FadeIn.duration(500)} className="mb-8">
        <AppText className="text-3xl font-bold text-white">News Junction</AppText>
        <AppText className="mt-2 text-slate-300">Premium mobile news experience foundation</AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500)} className="flex-1 justify-center">
        {step === 0 && <AppText className="text-lg text-white">Fast, modern and scalable mobile architecture.</AppText>}
        {step === 1 && <AppText className="text-lg text-white">Choose your language instantly.</AppText>}
        {step === 2 && <AppText className="text-lg text-white">Enable notifications for future updates.</AppText>}
        {step === 3 && <AppText className="text-lg text-white">Login to continue, or skip for now.</AppText>}
      </Animated.View>

      {step === 1 && (
        <View className="mb-4 flex-row gap-3">
          <AppButton title="English" className={language === "en" ? "bg-red-600 flex-1" : "flex-1"} onPress={() => setLanguage("en")} />
          <AppButton title="हिन्दी" className={language === "hi" ? "bg-red-600 flex-1" : "flex-1"} onPress={() => setLanguage("hi")} />
        </View>
      )}

      <View className="mb-8 gap-3">
        <AppButton title={step >= 3 ? "Continue to Login" : "Next"} onPress={next} />
        <AppButton
          title="Skip"
          className="bg-slate-700"
          onPress={async () => {
            await setStorageItem(STORAGE_KEYS.onboardingDone, "1");
            router.replace("/auth/login");
          }}
        />
      </View>

      <AppText className="mb-4 text-center text-xs text-slate-400">v1.0.0 · width {Math.round(width)}</AppText>
    </View>
  );
}
