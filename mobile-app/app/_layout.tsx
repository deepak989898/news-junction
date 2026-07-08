import "@/global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { AppProviders } from "@/providers/AppProviders";
import { env } from "@/config/env";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setReady(true);
      await SplashScreen.hideAsync();
    };
    init().catch(() => {});
  }, []);

  if (!ready) return null;

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}

export const unstable_settings = {
  initialRouteName: "index",
};

console.log(`News Junction Mobile v${env.appVersion} initialized`);
