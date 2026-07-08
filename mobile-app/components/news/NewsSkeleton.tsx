import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export function NewsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="overflow-hidden rounded-2xl bg-white">
          <Skeleton height={160} />
          <View className="gap-2 p-4">
            <Skeleton height={16} />
            <Skeleton height={16} width="80%" />
            <Skeleton height={12} width="40%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View className="px-4">
      <Skeleton height={220} />
    </View>
  );
}
