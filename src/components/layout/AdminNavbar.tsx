"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AdminNavbar({ title }: { title: string }) {
  const { adminUser } = useAuth();

  return (
    <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
      <h1 className="text-2xl font-bold text-[#1a2b4c]">{title}</h1>
      {adminUser && (
        <div className="text-right">
          <p className="text-sm font-medium text-[#1a2b4c]">{adminUser.name}</p>
          <p className="text-xs text-gray-500 capitalize">{adminUser.role}</p>
        </div>
      )}
    </header>
  );
}
