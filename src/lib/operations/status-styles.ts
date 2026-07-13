export type OpsTone = "good" | "warn" | "bad" | "neutral";

export const TONE_CLASSES: Record<
  OpsTone,
  { bg: string; border: string; text: string; badge: string; ring: string }
> = {
  good: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-900",
    badge: "bg-green-100 text-green-800",
    ring: "ring-green-200",
  },
  warn: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-900",
    ring: "ring-amber-200",
  },
  bad: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    badge: "bg-red-100 text-red-900",
    ring: "ring-red-200",
  },
  neutral: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-700",
    ring: "ring-gray-200",
  },
};

const GOOD = new Set([
  "healthy",
  "connected",
  "completed",
  "published",
  "active",
  "enabled",
  "running",
  "resolved",
  "success",
]);

const WARN = new Set([
  "warning",
  "unknown",
  "pending",
  "retrying",
  "needs attention",
  "partially_configured",
  "muted",
  "info",
]);

const BAD = new Set([
  "critical",
  "failed",
  "error",
  "disconnected",
  "cancelled",
  "disabled",
  "offline",
  "archive",
]);

export function opsTone(status: unknown): OpsTone {
  const s = String(status || "unknown").toLowerCase().trim();
  if (GOOD.has(s)) return "good";
  if (BAD.has(s)) return "bad";
  if (WARN.has(s)) return "warn";
  return "neutral";
}

export function dependencyTone(value: unknown): OpsTone {
  const v = String(value || "").toLowerCase();
  if (v === "connected") return "good";
  if (v.includes("needs attention") || v.includes("partial")) return "warn";
  if (v === "disconnected") return "bad";
  return opsTone(v);
}

export function queueStatusTone(status: unknown): OpsTone {
  const s = String(status || "").toLowerCase();
  if (s === "failed") return "bad";
  if (s === "published" || s === "completed") return "good";
  if (s === "pending" || s === "retrying" || s === "running") return "warn";
  if (s === "cancelled") return "neutral";
  return opsTone(s);
}

export function cronStatusTone(status: unknown, lastRun?: unknown): OpsTone {
  const s = String(status || "unknown").toLowerCase();
  if (s === "healthy") return "good";
  if (s === "failed") return "bad";
  if (s === "unknown" || !lastRun || lastRun === "Never") return "warn";
  return opsTone(s);
}

export function severityTone(severity: unknown): OpsTone {
  const s = String(severity || "").toLowerCase();
  if (s === "critical" || s === "error") return "bad";
  if (s === "warning") return "warn";
  return "good";
}

export function countTone(count: number, warnAt = 1, badAt = 5): OpsTone {
  if (count >= badAt) return "bad";
  if (count >= warnAt) return "warn";
  return "good";
}
