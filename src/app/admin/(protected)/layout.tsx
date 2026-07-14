"use client";

import { useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavTracker from "@/components/layout/AdminNavTracker";
import AdminBusyIndicator from "@/components/admin/AdminBusyIndicator";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminGuard>
      <AdminNavTracker />
      <AdminBusyIndicator />
      <div className="admin-compact min-h-screen bg-gray-50">
        <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <main className="lg:ml-56">
          <div className="p-2 md:p-3 lg:p-4">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
