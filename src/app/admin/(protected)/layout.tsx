"use client";

import { useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavTracker from "@/components/layout/AdminNavTracker";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminGuard>
      <AdminNavTracker />
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <main className="lg:ml-64">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
