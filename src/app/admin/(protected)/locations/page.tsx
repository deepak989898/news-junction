"use client";

import { useCallback, useEffect, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";

interface CoverageReport {
  generatedAt: string;
  dataset?: { districtCount?: number; cityCount?: number };
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

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.status === 504
        ? "Server timed out — try chunked seed or redeploy with longer maxDuration"
        : `Empty server response (HTTP ${res.status})`
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid server response: ${text.slice(0, 120)}`);
  }
}

export default function AdminLocationsPage() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const getToken = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/firebase/config");
    const user = getAuth(getFirebaseApp()).currentUser;
    if (!user) throw new Error("Not authenticated — log in again");
    return user.getIdToken();
  }, []);

  const apiPost = useCallback(
    async (body: Record<string, unknown>) => {
      const token = await getToken();
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || `HTTP ${res.status}`));
      return data;
    },
    [getToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/locations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await parseJsonResponse(res)) as unknown as CoverageReport;
      if (!res.ok) throw new Error("Failed to load");
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const runSeedChunked = async () => {
    setBusy(true);
    const log: string[] = [];
    try {
      const phases: Array<"states" | "districts" | "cities"> = ["states", "districts", "cities"];
      for (const phase of phases) {
        let offset = 0;
        let done = false;
        while (!done) {
          setActionMsg(`Seeding ${phase}… (${offset} done)`);
          const data = await apiPost({
            action: "seedChunk",
            phase,
            offset,
            limit: 150,
          });
          log.push(JSON.stringify(data));
          setActionMsg(log.join("\n"));
          done = Boolean(data.done);
          offset = Number(data.nextOffset || 0);
          if (phase === "states") break;
        }
      }
      toast.success("Firestore locations seeded successfully");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: "backfill", dryRun = false) => {
    setBusy(true);
    try {
      setActionMsg(dryRun ? "Backfill dry run…" : "Backfill running…");
      const data = await apiPost({ action, dryRun, limit: 200 });
      setActionMsg(JSON.stringify(data, null, 2));
      toast.success(dryRun ? "Dry run completed" : "Backfill completed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
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
            {report.dataset && (
              <p className="text-sm text-gray-600">
                Dataset: {report.dataset.districtCount ?? "—"} districts,{" "}
                {report.dataset.cityCount ?? "—"} cities
              </p>
            )}

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
                onClick={runSeedChunked}
                disabled={busy}
                className="rounded-lg bg-[#1a2b4c] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? "Seeding…" : "Seed Firestore locations"}
              </button>
              <button
                onClick={() => runAction("backfill", true)}
                disabled={busy}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                Backfill (dry run)
              </button>
              <button
                onClick={() => runAction("backfill", false)}
                disabled={busy}
                className="rounded-lg border border-[#c41e20] px-4 py-2 text-sm text-[#c41e20] disabled:opacity-50"
              >
                Backfill locations
              </button>
            </div>

            {actionMsg && (
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs whitespace-pre-wrap">
                {actionMsg}
              </pre>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
