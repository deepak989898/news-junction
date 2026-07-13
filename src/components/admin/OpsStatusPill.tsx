import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OpsTone, TONE_CLASSES } from "@/lib/operations/status-styles";

interface OpsStatusPillProps {
  label: string;
  tone?: OpsTone;
  className?: string;
}

export default function OpsStatusPill({ label, tone = "neutral", className }: OpsStatusPillProps) {
  const c = TONE_CLASSES[tone];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", c.badge, className)}>
      {label}
    </span>
  );
}

interface OpsStatusCardProps {
  tone?: OpsTone;
  className?: string;
  children: ReactNode;
}

export function OpsStatusCard({ tone = "neutral", className, children }: OpsStatusCardProps) {
  const c = TONE_CLASSES[tone];
  return (
    <div className={cn("rounded-lg border-l-4 p-3", c.bg, c.border, className)}>
      {children}
    </div>
  );
}

interface OpsMetricCardProps {
  label: string;
  value: string | number;
  tone?: OpsTone;
  hint?: string;
}

export function OpsMetricCard({ label, value, tone = "neutral", hint }: OpsMetricCardProps) {
  const c = TONE_CLASSES[tone];
  return (
    <div className={cn("rounded-xl border p-4 shadow-sm ring-1", c.bg, c.border, c.ring)}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold capitalize", c.text)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
