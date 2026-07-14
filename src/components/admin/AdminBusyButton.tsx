"use client";

import { ButtonHTMLAttributes, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { runWithAdminBusy } from "@/lib/admin/busy-store";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Shown in the global progress overlay */
  busyLabel?: string;
  onClickAsync?: () => Promise<void>;
};

/**
 * Button that shows spinner + disables itself while async work runs.
 * Also drives the global admin progress overlay.
 */
export default function AdminBusyButton({
  busyLabel = "Working… please wait",
  onClickAsync,
  onClick,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  const [localBusy, setLocalBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (localBusy || disabled) return;
    if (onClickAsync) {
      e.preventDefault();
      setLocalBusy(true);
      try {
        await runWithAdminBusy(busyLabel, onClickAsync, "write");
      } finally {
        setLocalBusy(false);
      }
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || localBusy}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {localBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
