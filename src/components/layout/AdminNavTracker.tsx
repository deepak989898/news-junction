"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAdminNavigation } from "@/hooks/useAdminBack";

/** Records admin page visits so the topbar back button returns to the previous admin screen. */
export default function AdminNavTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) trackAdminNavigation(pathname);
  }, [pathname]);

  return null;
}
