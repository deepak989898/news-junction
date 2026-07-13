"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";

export default function LocationCoverageAnalyticsPage() {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/firebase/config");
    const user = getAuth(getFirebaseApp()).currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/admin/locations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        setReport(await res.json());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["super_admin", "editor"]}>
        <AdminTopbar title="Location Coverage" />
        <LoadingSpinner />
      </RoleGuard>
    );
  }

  if (!report) return null;

  const dist = report.distribution as Record<string, number>;
  const byState = report.articlesByState as Record<string, number>;

  return (
    <RoleGuard allowedRoles={["super_admin", "editor"]}>
      <AdminTopbar title="Location Coverage" />
      <div className="space-y-6 p-6">
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Daily distribution</h2>
          <pre className="mt-2 text-xs">{JSON.stringify(dist, null, 2)}</pre>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Articles by state ID</h2>
          <pre className="mt-2 max-h-64 overflow-auto text-xs">{JSON.stringify(byState, null, 2)}</pre>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Empty location pages</h2>
          <ul className="mt-2 max-h-48 overflow-auto text-sm">
            {((report.emptyLocationPages as string[]) || []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </div>
    </RoleGuard>
  );
}
