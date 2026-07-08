"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldX className="mb-4 text-[#c41e20]" size={64} />
      <h1 className="text-2xl font-bold text-[#1a2b4c]">Access Denied</h1>
      <p className="mt-2 max-w-md text-gray-600">
        You do not have permission to access this page. Contact a super admin if you need access.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/admin" className="rounded-lg bg-[#1a2b4c] px-6 py-2.5 text-sm font-bold text-white">
          Go to Dashboard
        </Link>
        <Link href="/admin/news" className="rounded-lg border px-6 py-2.5 text-sm font-medium">
          Manage News
        </Link>
      </div>
    </div>
  );
}
