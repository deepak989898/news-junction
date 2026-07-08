"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSuperAdmin?: boolean;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  children,
  allowedRoles = ["super_admin", "editor"],
  requireSuperAdmin = false,
  fallback,
}: RoleGuardProps) {
  const { adminUser, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/admin/login");
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin || !adminUser) return null;

  const hasAccess =
    requireSuperAdmin
      ? adminUser.role === "super_admin"
      : allowedRoles.includes(adminUser.role);

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    router.replace("/admin/access-denied");
    return null;
  }

  return <>{children}</>;
}
