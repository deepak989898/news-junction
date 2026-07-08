import { TextInput, TextInputProps } from "react-native";
import { cn } from "@/utils/cn";

export function AppInput({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      className={cn(
        "rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900",
        className
      )}
      placeholderTextColor="#64748b"
      {...props}
    />
  );
}
