"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  exportAnalyticsApi,
  generateReportApi,
  getAnalyticsSettingsApi,
  getAnalyticsSummaryApi,
  getContentPerformanceApi,
  getGrowthInsightsApi,
  getRevenueSummaryApi,
  getTrendDiscoveryApi,
  updateAnalyticsSettingsApi,
} from "@/lib/ai-analytics/client-api";
import { AnalyticsAiSettings } from "@/lib/ai-analytics/types";
import toast from "react-hot-toast";

export default function AnalyticsManagerPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [growth, setGrowth] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [trends, setTrends] = useState<Record<string, unknown> | null>(null);
  const [revenue, setRevenue] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<AnalyticsAiSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Partial<AnalyticsAiSettings>>({});
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");

  const load = async () => {
    const [s, g, c, t, r, st] = await Promise.all([
      getAnalyticsSummaryApi(range),
      getGrowthInsightsApi(),
      getContentPerformanceApi(),
      getTrendDiscoveryApi(),
      getRevenueSummaryApi(),
      getAnalyticsSettingsApi(),
    ]);
    setSummary(s as Record<string, unknown>);
    setGrowth(g as Record<string, unknown>);
    setContent(c as Record<string, unknown>);
    setTrends(t as Record<string, unknown>);
    setRevenue(r as Record<string, unknown>);
    setSettings(st as AnalyticsAiSettings);
    setSettingsDraft(st as AnalyticsAiSettings);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load analytics manager");
      setLoading(false);
    });
  }, [range]);

  const topPages = useMemo(() => ((summary?.topPages as Record<string, unknown>[]) || []).slice(0, 8), [summary]);
  const topCategories = useMemo(() => ((summary?.topCategories as Record<string, unknown>[]) || []).slice(0, 8), [summary]);
  const recs = useMemo(() => ((growth?.recommendations as Record<string, unknown>[]) || []).slice(0, 12), [growth]);
  const trendList = useMemo(() => ((trends?.suggestions as Record<string, unknown>[]) || []).slice(0, 10), [trends]);
  const perf = useMemo(() => ((content?.items as Record<string, unknown>[]) || []).slice(0, 20), [content]);

  const saveSettings = async () => {
    const updated = await updateAnalyticsSettingsApi(settingsDraft as Record<string, unknown>);
    setSettings(updated as AnalyticsAiSettings);
    setSettingsDraft(updated as AnalyticsAiSettings);
    toast.success("Analytics settings updated");
  };

  const generateReport = async () => {
    await generateReportApi({ reportType });
    toast.success(`${reportType} report generated`);
  };

  const exportReport = async (format: "csv" | "excel" | "pdf") => {
    const res = (await exportAnalyticsApi({ format, reportType })) as Record<string, unknown>;
    const contentText = String(res.content || "");
    const blob = new Blob([contentText], { type: String(res.contentType || "text/plain") });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = String(res.filename || `analytics-${Date.now()}.txt`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()} export downloaded`);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const sourceStates = (summary?.sources || {}) as Record<string, unknown>;
  const sourceUnavailable = Object.entries(sourceStates)
    .filter(([, v]) => String(v) !== "enabled")
    .map(([k, v]) => `${k}: ${String(v)}`);

  return (
    <RoleGuard>
      <AdminTopbar
        title="AI Analytics Manager"
        actions={
          <div className="flex items-center gap-2">
            <select className="rounded border px-2 py-1 text-sm" value={range} onChange={(e) => setRange(e.target.value as "today" | "7d" | "30d")}>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button onClick={load} className="rounded border px-3 py-1 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button>
          </div>
        }
      />

      {sourceUnavailable.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          External analytics unavailable: {sourceUnavailable.join(", ")}. Dashboard shows available internal data only.
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Today's visitors</p><p className="text-2xl font-bold">{String(summary?.todayVisitors ?? "Unavailable")}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Yesterday</p><p className="text-2xl font-bold">{String(summary?.yesterdayVisitors ?? "Unavailable")}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Last 7 days</p><p className="text-2xl font-bold">{String(summary?.last7DaysVisitors ?? "Unavailable")}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Last 30 days</p><p className="text-2xl font-bold">{String(summary?.last30DaysVisitors ?? "Unavailable")}</p></div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]"><BarChart3 className="mr-1 inline h-4 w-4" />Top Pages</h3>
          <div className="space-y-2 text-sm">
            {topPages.map((p) => (
              <div key={String(p.path)} className="rounded border p-2">{String(p.path)} · {String(p.value)}</div>
            ))}
            {!topPages.length && <p className="text-gray-500">No page data available.</p>}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]"><TrendingUp className="mr-1 inline h-4 w-4" />Top Categories</h3>
          <div className="space-y-2 text-sm">
            {topCategories.map((c) => (
              <div key={String(c.category)} className="rounded border p-2">{String(c.category)} · {String(c.value)}</div>
            ))}
            {!topCategories.length && <p className="text-gray-500">No category data available.</p>}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">AI Growth Recommendations</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {recs.map((r, idx) => (
            <div key={`${String(r.title)}-${idx}`} className="rounded border p-3 text-sm">
              <p className="font-semibold">{String(r.title)}</p>
              <p className="text-gray-600">{String(r.reason)}</p>
              <p className="text-xs text-gray-500">Priority: {String(r.priority)} · Confidence: {String(r.confidence)}</p>
            </div>
          ))}
          {!recs.length && <p className="text-sm text-gray-500">No recommendations yet.</p>}
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Trend Discovery</h3>
          <div className="space-y-2 text-sm">
            {trendList.map((t, idx) => (
              <div key={`${String(t.title)}-${idx}`} className="rounded border p-2">
                <p className="font-medium">{String(t.title)}</p>
                <p className="text-xs text-gray-500">{String(t.description)}</p>
              </div>
            ))}
            {!trendList.length && <p className="text-gray-500">No trend suggestions yet.</p>}
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Revenue Summary</h3>
          <p className="mb-2 text-sm">Estimated revenue: <strong>${String(revenue?.estimatedRevenue ?? "Unavailable")}</strong></p>
          <div className="space-y-2 text-sm">
            {((revenue?.topRevenueArticles as Record<string, unknown>[]) || []).slice(0, 8).map((x) => (
              <div key={String(x.articleId)} className="rounded border p-2">{String(x.title)} · ${String(x.value)}</div>
            ))}
            {!((revenue?.topRevenueArticles as Record<string, unknown>[]) || []).length && (
              <p className="text-gray-500">Revenue provider integrations unavailable; showing placeholders where possible.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Content Performance</h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">Title</th>
                <th>Views</th>
                <th>Trend</th>
                <th>Editorial</th>
                <th>SEO</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((p) => (
                <tr key={String(p.articleId)} className="border-b">
                  <td className="py-2">{String(p.title)}</td>
                  <td>{String(p.views)}</td>
                  <td>{String(p.trafficTrend)}</td>
                  <td>{String(p.editorialScore ?? "NA")}</td>
                  <td>{String(p.seoScore ?? "NA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]">Reports & Export</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded border px-2 py-1 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value as "daily" | "weekly" | "monthly")}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={generateReport}>Generate Report</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => exportReport("csv")}><Download className="mr-1 inline h-4 w-4" />CSV</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => exportReport("excel")}><Download className="mr-1 inline h-4 w-4" />Excel</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => exportReport("pdf")}><Download className="mr-1 inline h-4 w-4" />PDF</button>
        </div>
      </div>

      {settings && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]">Analytics AI Settings</h3>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <label><input type="checkbox" checked={Boolean(settingsDraft.analyticsEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, analyticsEnabled: e.target.checked }))} /> Analytics enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.insightsEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, insightsEnabled: e.target.checked }))} /> Insights enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.trendDiscoveryEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, trendDiscoveryEnabled: e.target.checked }))} /> Trend discovery enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.dailyReportEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, dailyReportEnabled: e.target.checked }))} /> Daily report enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.weeklyReportEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, weeklyReportEnabled: e.target.checked }))} /> Weekly report enabled</label>
            <label><input type="checkbox" checked={Boolean(settingsDraft.monthlyReportEnabled)} onChange={(e) => setSettingsDraft((p) => ({ ...p, monthlyReportEnabled: e.target.checked }))} /> Monthly report enabled</label>
            <label>Minimum traffic alert<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.minimumTrafficAlert || 30)} onChange={(e) => setSettingsDraft((p) => ({ ...p, minimumTrafficAlert: Number(e.target.value) }))} /></label>
            <label>Minimum revenue alert<input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(settingsDraft.minimumRevenueAlert || 20)} onChange={(e) => setSettingsDraft((p) => ({ ...p, minimumRevenueAlert: Number(e.target.value) }))} /></label>
          </div>
          <button className="mt-3 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveSettings}>Save Settings</button>
        </div>
      )}
    </RoleGuard>
  );
}
