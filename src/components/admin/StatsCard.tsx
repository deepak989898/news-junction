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
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#1a2b4c]">
            {formatNumber(value)}
          </p>
        </div>
        <div className={`rounded-lg p-3 ${colorMap[color]} text-white`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
