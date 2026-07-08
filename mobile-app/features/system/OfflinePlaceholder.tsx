import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";

export function OfflinePlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="rounded-xl border border-slate-300 bg-white p-4">
      <AppText className="text-lg font-semibold">Offline mode</AppText>
      <AppText className="mt-1 text-slate-600">No internet connection. Retry when network is available.</AppText>
      <AppButton title="Retry" className="mt-3" onPress={onRetry} />
    </View>
  );
}
