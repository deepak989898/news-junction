import { Text, TextProps } from "react-native";
import { cn } from "@/utils/cn";

export function AppText({ className, ...props }: TextProps & { className?: string }) {
  return <Text className={cn("text-slate-900", className)} {...props} />;
}
