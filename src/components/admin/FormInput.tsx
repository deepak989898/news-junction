import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function FormInput({ label, error, className, ...props }: FormInputProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        className={cn(
          "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1a2b4c] focus:outline-none focus:ring-1 focus:ring-[#1a2b4c]",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
