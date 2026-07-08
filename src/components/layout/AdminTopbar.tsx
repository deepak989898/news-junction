"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminTopbarProps {
  title: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
}

export default function AdminTopbar({ title, onMenuClick, actions }: AdminTopbarProps) {
  const { adminUser } = useAuth();

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-[#1a2b4c] hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="text-xl font-bold text-[#1a2b4c] md:text-2xl">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {adminUser && (
          <div className="text-right">
            <p className="text-sm font-medium text-[#1a2b4c]">{adminUser.name}</p>
            <p className="text-xs capitalize text-gray-500">{adminUser.role}</p>
          </div>
        )}
      </div>
    </header>
  );
}
