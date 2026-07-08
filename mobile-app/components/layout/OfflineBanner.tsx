import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useNetwork } from "@/providers/NetworkProvider";

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  const { online } = useNetwork();
  if (online) return null;
  return (
    <Pressable onPress={onRetry} className="bg-amber-500 px-4 py-2">
      <AppText className="text-center text-sm font-medium text-white">Offline mode — tap to retry</AppText>
    </Pressable>
  );
}
