"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Play,
  RefreshCw,
  ExternalLink,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import type { VerificationFeature, VerificationTestId } from "@/lib/system-verification/registry";

type VerificationResponse = {
  features: VerificationFeature[];
  cronJobs: Array<Record<string, string>>;
  envStatus: Record<string, boolean | string>;
  generatedAt: string;
  role: string;
};

type TestResult = {
  testId: string;
  ok: boolean;
  message: string;
  durationMs: number;
  testedAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  working: "bg-green-100 text-green-800",
  partially_configured: "bg-amber-100 text-amber-800",
  configuration_required: "bg-orange-100 text-orange-800",
  not_implemented: "bg-gray-100 text-gray-700",
  error: "bg-red-100 text-red-800",
  unknown: "bg-slate-100 text-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  working: "Ready",
  partially_configured: "Partially Configured",
  configuration_required: "Configuration Required",
  not_implemented: "Not Implemented",
  error: "Error",
  unknown: "Unknown",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "working") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "not_implemented") return <XCircle className="h-4 w-4 text-gray-500" />;
  if (status === "configuration_required" || status === "error") {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}

export default function SystemVerificationPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/firebase/config");
    const user = getAuth(getFirebaseApp()).currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, []);

  const load = useCallback(async () => {
    const token = await getToken();
    const res = await fetch("/api/admin/system-verification", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load verification data");
    const json = await res.json();
    setData(json);
  }, [getToken]);

  useEffect(() => {
    load()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const runTest = async (testId: VerificationTestId, sensitive?: boolean) => {
    if (sensitive && adminUser?.role !== "super_admin") {
      toast.error("Super admin only");
      return;
    }
    setRunningTest(testId);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/system-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");
      setTestResults((prev) => ({ ...prev, [testId]: json.result }));
      toast[json.result.ok ? "success" : "error"](json.result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setRunningTest(null);
    }
  };

  const features = data?.features || [];
  const counts = {
    working: features.filter((f) => f.status === "working").length,
    partial: features.filter((f) => f.status === "partially_configured").length,
    config: features.filter((f) => f.status === "configuration_required").length,
    notImpl: features.filter((f) => f.status === "not_implemented").length,
  };

  return (
    <RoleGuard requireSuperAdmin>
      <AdminTopbar title="System Verification" />
      <div className="space-y-6 p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold">Run test (green ✓) vs Feature status — different things</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800">
                <li>
                  <strong>Run / Quick test</strong> = checks one thing only (e.g. RSS fetch works, API key exists).
                </li>
                <li>
                  <strong>100% + green Ready</strong> = all setup + manual steps done.
                </li>
                <li>
                  <strong>Manual steps</strong> (marked in checklist) = you must use the feature once (e.g. generate audio, run SEO audit).
                </li>
                <li>
                  <strong>Optional</strong> items (gray) = enhancements only — do not affect %.
                </li>
                <li>
                  Amber = setup or manual steps still missing — complete red ✗ items.
                </li>
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Ready (100% configured)</p>
                <p className="text-2xl font-bold text-green-600">{counts.working}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Partially Configured</p>
                <p className="text-2xl font-bold text-amber-600">{counts.partial}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Config Required</p>
                <p className="text-2xl font-bold text-orange-600">{counts.config}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Not Implemented</p>
                <p className="text-2xl font-bold text-gray-600">{counts.notImpl}</p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#1a2b4c]">Quick Safe Tests</h2>
                  <p className="text-sm text-gray-500">No articles published, no mass notifications</p>
                </div>
                <button
                  onClick={() => load().then(() => toast.success("Refreshed"))}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    ["firebase_public_config", "Firebase Config"],
                    ["firebase_admin", "Firebase Admin"],
                    ["firestore_read", "Firestore Read"],
                    ["storage_bucket", "Storage"],
                    ["cron_secret", "Cron Secret"],
                    ["rss_fetch", "RSS Fetch"],
                    ["automation_settings", "Automation"],
                    ["site_url", "Site URL"],
                    ["analytics_env", "Analytics Env"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => runTest(id)}
                    disabled={runningTest === id}
                    className="flex items-center gap-1 rounded-lg bg-[#1a2b4c] px-3 py-2 text-xs text-white hover:bg-[#243a66] disabled:opacity-50"
                  >
                    <Play size={12} />
                    {label}
                    {testResults[id] && (
                      <span className={testResults[id].ok ? "text-green-300" : "text-red-300"}>
                        {testResults[id].ok ? "✓" : "✗"}
                      </span>
                    )}
                  </button>
                ))}
                {adminUser?.role === "super_admin" && (
                  <button
                    onClick={() => runTest("ai_openai_ping", true)}
                    disabled={runningTest === "ai_openai_ping"}
                    className="flex items-center gap-1 rounded-lg border border-[#c41e20] px-3 py-2 text-xs text-[#c41e20] hover:bg-red-50"
                  >
                    <Shield size={12} /> OpenAI Ping (super_admin)
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold text-[#1a2b4c]">Feature Matrix</h2>
                <p className="text-xs text-gray-500">Generated: {data?.generatedAt}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Complete</th>
                      <th className="px-4 py-3">Setup checklist</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Test</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {features.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1a2b4c]">{f.name}</p>
                          <p className="text-xs text-gray-500">{f.nameHi}</p>
                          <p className="mt-1 text-xs text-gray-600 max-w-md">{f.description}</p>
                          <p className="mt-1 text-xs text-gray-500">{f.fixInstructions}</p>
                          {f.requiredEnv.length > 0 && (
                            <p className="mt-1 text-xs text-blue-700">Env: {f.requiredEnv.join(", ")}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[f.status] || STATUS_STYLES.unknown}`}
                          >
                            <StatusIcon status={f.status} />
                            {STATUS_LABELS[f.status] || f.status}
                          </span>
                          <p className="mt-1 text-xs text-gray-500">{f.label}</p>
                          {f.status === "working" && f.hasKnownLimits && (
                            <p className="mt-1 text-xs text-blue-700">
                              Setup complete. Some platforms/features have known limits — see description.
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-[72px]">
                            <p
                              className={`text-lg font-bold ${
                                (f.completionPercent ?? 0) === 100
                                  ? "text-green-600"
                                  : (f.completionPercent ?? 0) >= 50
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }`}
                            >
                              {f.completionPercent ?? 0}%
                            </p>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full rounded-full ${
                                  (f.completionPercent ?? 0) === 100
                                    ? "bg-green-500"
                                    : (f.completionPercent ?? 0) >= 50
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${f.completionPercent ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[220px]">
                          <ul className="space-y-1 text-xs">
                            {(f.checklist || []).map((item) => {
                              const isOptional = item.kind === "optional";
                              const isManual = item.kind === "manual";
                              const icon = item.done ? (
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                              ) : isOptional ? (
                                <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-gray-400" />
                              ) : (
                                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                              );
                              const textClass = item.done
                                ? "text-green-800"
                                : isOptional
                                  ? "text-gray-500"
                                  : isManual
                                    ? "font-medium text-orange-800"
                                    : "font-medium text-red-700";
                              return (
                                <li key={item.id} className="flex items-start gap-1.5">
                                  {icon}
                                  <span className={textClass}>
                                    {isManual && !item.done ? "Action: " : ""}
                                    {item.label}
                                    {isOptional ? " (optional)" : isManual ? " (manual)" : ""}
                                    {!item.done && !isOptional && item.adminPath ? (
                                      <>
                                        {" — "}
                                        <Link href={item.adminPath} className="text-[#c41e20] underline">
                                          Fix
                                        </Link>
                                      </>
                                    ) : null}
                                  </span>
                                </li>
                              );
                            })}
                            {!f.checklist?.length && <span className="text-gray-400">—</span>}
                          </ul>
                        </td>
                        <td className="px-4 py-3">
                          {f.adminPath && (
                            <Link href={f.adminPath} className="text-[#c41e20] hover:underline text-xs">
                              Open
                            </Link>
                          )}
                          {f.docPath && (
                            <a href={f.docPath} target="_blank" rel="noreferrer" className="ml-2 text-xs text-gray-500 hover:underline">
                              Docs
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {f.testId && (
                            <button
                              onClick={() => runTest(f.testId!, f.sensitiveTest)}
                              disabled={runningTest === f.testId}
                              className="text-xs text-[#1a2b4c] hover:underline"
                            >
                              Run
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-[#1a2b4c] mb-3">Cron Jobs</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Route</th>
                      <th className="py-2 pr-4">Schedule</th>
                      <th className="py-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data?.cronJobs || []).map((job) => (
                      <tr key={job.name}>
                        <td className="py-2 pr-4 font-medium">{job.name}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{job.route}</td>
                        <td className="py-2 pr-4 text-xs">{job.schedule}</td>
                        <td className="py-2 text-xs text-gray-600">{job.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <div className="flex gap-2">
                <HelpCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Hindi documentation</p>
                  <p className="mt-1 text-amber-800">
                    Complete guides:{" "}
                    <Link href="/docs/hindi/ADMIN_COMPLETE_GUIDE.md" className="underline" target="_blank">
                      ADMIN_COMPLETE_GUIDE.md
                    </Link>
                    ,{" "}
                    <Link href="/docs/hindi/ENV_SETUP_GUIDE.md" className="underline" target="_blank">
                      ENV_SETUP_GUIDE.md
                    </Link>
                    ,{" "}
                    <Link href="/docs/hindi/LOCATION_SETUP_GUIDE.md" className="underline" target="_blank">
                      LOCATION_SETUP_GUIDE.md
                    </Link>
                  </p>
                  <p className="mt-2 text-xs text-amber-700">
                    <ExternalLink size={12} className="inline" /> Docs served at /docs/hindi/*.md after deploy.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
