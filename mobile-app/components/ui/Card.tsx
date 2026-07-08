import { View, ViewProps } from "react-native";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("rounded-2xl bg-white p-4 shadow-sm", className)} {...props} />;
}
