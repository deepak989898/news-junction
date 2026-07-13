"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";

interface CoverageReport {
  generatedAt: string;
  distribution: {
    total: number;
    india: number;
    international: number;
    indiaPercent: number;
    internationalPercent: number;
  };
  statesWithNews: number;
  statesWithoutNews: string[];
  districtsWithNews: number;
  citiesWithNews: number;
  lowConfidenceCount: number;
  unmappedCount: number;
  emptyLocationPages: string[];
}

export default function AdminLocationsPage() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const getToken = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/firebase/config");
    const user = getAuth(getFirebaseApp()).currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/locations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      setReport(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: "seed" | "backfill", dryRun = false) => {
    try {
      setActionMsg("Running...");
      const token = await getToken();
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, dryRun, limit: 200 }),
      });
      const data = await res.json();
      setActionMsg(JSON.stringify(data, null, 2));
      toast.success("Action completed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <RoleGuard allowedRoles={["super_admin", "editor"]}>
      <AdminTopbar title="Locations" />
      <div className="space-y-6 p-6">
        {loading ? (
          <LoadingSpinner />
        ) : !report ? (
          <p>Failed to load report.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Generated: {report.generatedAt}</p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">India / International (today)</p>
                <p className="text-2xl font-bold">
                  {report.distribution.indiaPercent}% / {report.distribution.internationalPercent}%
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">States with news</p>
                <p className="text-2xl font-bold">{report.statesWithNews}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-500">Low confidence / unmapped</p>
                <p className="text-2xl font-bold">
                  {report.lowConfidenceCount} / {report.unmappedCount}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => runAction("seed")}
                className="rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm text-white"
              >
                Seed Firestore locations
              </button>
              <button
                onClick={() => runAction("backfill", true)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Backfill (dry run)
              </button>
              <button
                onClick={() => runAction("backfill", false)}
                className="rounded-lg border border-[#c41e20] px-4 py-2 text-sm text-[#c41e20]"
              >
                Backfill locations
              </button>
            </div>

            {actionMsg && (
              <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs">{actionMsg}</pre>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
