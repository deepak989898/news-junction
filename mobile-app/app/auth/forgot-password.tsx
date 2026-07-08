import { useState } from "react";
import { View } from "react-native";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <AppText className="mb-2 text-2xl font-bold">Reset Password</AppText>
      <AppInput value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" />
      <AppButton
        title="Send Reset Link"
        className="mt-3"
        onPress={async () => {
          await forgotPassword(email);
          setStatus("Password reset link sent.");
        }}
      />
      {status ? <AppText className="mt-2 text-slate-600">{status}</AppText> : null}
    </View>
  );
}
