import { Pressable, PressableProps, Text } from "react-native";
import { cn } from "@/utils/cn";

export function AppButton({
  title,
  className,
  ...props
}: PressableProps & { title: string; className?: string }) {
  return (
    <Pressable className={cn("rounded-xl bg-slate-900 px-4 py-3", className)} {...props}>
      <Text className="text-center font-semibold text-white">{title}</Text>
    </Pressable>
  );
}
