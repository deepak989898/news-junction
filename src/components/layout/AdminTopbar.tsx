"use client";

import { Menu, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBack } from "@/hooks/useAdminBack";

interface AdminTopbarProps {
  title: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  /** Hide back button on special pages (default: auto from route) */
  hideBack?: boolean;
}

export default function AdminTopbar({ title, onMenuClick, actions, hideBack = false }: AdminTopbarProps) {
  const { adminUser } = useAuth();
  const { showBack, goBack, previousLabel } = useAdminBack();

  return (
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-1.5 text-[#1a2b4c] hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}
        {showBack && !hideBack && (
          <button
            type="button"
            onClick={goBack}
            className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-[#1a2b4c] shadow-sm hover:bg-gray-50"
            title={`Back to ${previousLabel}`}
            aria-label={`Back to ${previousLabel}`}
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-[#1a2b4c] md:text-lg">{title}</h1>
          {showBack && !hideBack && previousLabel ? (
            <p className="truncate text-[10px] text-gray-500">Previous: {previousLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {adminUser && (
          <div className="text-right leading-tight">
            <p className="text-xs font-medium text-[#1a2b4c]">{adminUser.name}</p>
            <p className="text-[10px] capitalize text-gray-500">{adminUser.role}</p>
          </div>
        )}
      </div>
    </header>
  );
}
