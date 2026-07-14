"use client";

import { formatNumber } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: "navy" | "red" | "green" | "blue";
}

const colorMap = {
  navy: "bg-[#1a2b4c]",
  red: "bg-[#c41e20]",
  green: "bg-green-600",
  blue: "bg-blue-600",
};

export default function StatsCard({ title, value, icon: Icon, color = "navy" }: StatsCardProps) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-gray-500">{title}</p>
          <p className="mt-0.5 text-xl font-bold leading-none text-[#1a2b4c]">
            {formatNumber(value)}
          </p>
        </div>
        <div className={`shrink-0 rounded-md p-1.5 ${colorMap[color]} text-white`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}
