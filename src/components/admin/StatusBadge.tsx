import { NewsStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: NewsStatus | string | boolean;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const label =
    status === "active" ? "Active" :
    status === "published" ? "Published" :
    status === "draft" ? "Draft" :
    typeof status === "boolean" ? (status ? "Active" : "Inactive") :
    String(status);

  const colorClass =
    status === "published" || status === "active" || status === true
      ? "bg-green-100 text-green-700"
      : status === "draft"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-gray-100 text-gray-600";

  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", colorClass, className)}>
      {label}
    </span>
  );
}
