import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppText } from "@/components/ui/AppText";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNetwork } from "@/providers/NetworkProvider";
import { OfflinePlaceholder } from "@/features/system/OfflinePlaceholder";

export default function HomeScreen() {
  const { online } = useNetwork();
  const { isLoading } = useQuery({
    queryKey: ["home-placeholder"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return true;
    },
  });

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-16">
      <AppText className="text-2xl font-bold">Home Placeholder</AppText>
      <AppText className="mt-1 text-slate-600">News feed will be implemented in later phases.</AppText>
      {!online && <View className="mt-4"><OfflinePlaceholder onRetry={() => {}} /></View>}
      <View className="mt-6 gap-3">
        {isLoading ? (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        ) : (
          <AppText className="text-slate-700">Foundation ready for pagination and cached feed queries.</AppText>
        )}
      </View>
    </View>
  );
}
