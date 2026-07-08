import { useState } from "react";
import { View } from "react-native";
import { Link, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { useAuth } from "@/hooks/useAuth";
import { setStorageItem } from "@/services/storage/app-storage";
import { STORAGE_KEYS } from "@/constants/storage-keys";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  const { control, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setError("");
      await signIn(values.email, values.password, values.remember);
      await setStorageItem(STORAGE_KEYS.rememberLogin, values.remember ? "1" : "0");
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  });

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <AppText className="mb-2 text-3xl font-bold">Welcome Back</AppText>
      <AppText className="mb-6 text-slate-500">Sign in to News Junction mobile</AppText>
      <Controller control={control} name="email" render={({ field }) => <AppInput placeholder="Email" autoCapitalize="none" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="password" render={({ field }) => <AppInput className="mt-3" placeholder="Password" secureTextEntry value={field.value} onChangeText={field.onChange} />} />
      <AppButton title={watch("remember") ? "Remembered login enabled" : "Remembered login disabled"} className="mt-3 bg-slate-700" onPress={() => setValue("remember", !watch("remember"))} />
      {error ? <AppText className="mt-2 text-red-600">{error}</AppText> : null}
      <AppButton title="Login" className="mt-3" onPress={onSubmit} />
      <Link href="/auth/forgot-password" className="mt-4 text-slate-700">Forgot Password?</Link>
      <AppButton title="Google Sign-In (placeholder)" className="mt-3 bg-red-600" onPress={() => setError("Google Sign-In to be connected with Expo AuthSession in Phase 6B")} />
    </View>
  );
}
