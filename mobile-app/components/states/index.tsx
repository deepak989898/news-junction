import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <AppText className="text-center text-lg font-semibold text-slate-800">{title}</AppText>
      {subtitle ? <AppText className="mt-2 text-center text-slate-500">{subtitle}</AppText> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <AppText className="text-center text-red-600">{message}</AppText>
      {onRetry ? <AppButton title="Retry" className="mt-4" onPress={onRetry} /> : null}
    </View>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <View className="items-center justify-center px-6 py-8">
      <AppText className="text-center font-medium text-amber-700">You are offline</AppText>
      <AppText className="mt-1 text-center text-sm text-slate-500">Showing cached content where available.</AppText>
      {onRetry ? <AppButton title="Retry" className="mt-4" onPress={onRetry} /> : null}
    </View>
  );
}
