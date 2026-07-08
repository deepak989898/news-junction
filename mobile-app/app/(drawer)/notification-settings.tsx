import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { requestNotificationPermission } from "@/services/permissions/permission-manager";

export default function NotificationSettingsScreen() {
  const [status, setStatus] = useState("Not checked");
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Notification Settings</AppText>
      <AppText className="mt-2 text-slate-600">Status: {status}</AppText>
      <AppButton
        title="Request Permission"
        className="mt-3"
        onPress={async () => setStatus((await requestNotificationPermission()) ? "Granted" : "Denied")}
      />
    </View>
  );
}
