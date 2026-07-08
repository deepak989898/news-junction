"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2, RefreshCw, Users, Bookmark, Bell, MousePointerClick } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getPersonalizationAdminDashboardApi,
  getPersonalizationSettingsApi,
  updatePersonalizationSettingsApi,
} from "@/lib/personalization/client-api";
import { PersonalizationSettings } from "@/lib/personalization/types";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function PersonalizationAdminPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null);
  const [draft, setDraft] = useState<Partial<PersonalizationSettings>>({});

  const load = async () => {
    const [dash, st] = await Promise.all([getPersonalizationAdminDashboardApi(), getPersonalizationSettingsApi()]);
    setDashboard(dash as Record<string, unknown>);
    setSettings(st as PersonalizationSettings);
    setDraft(st as PersonalizationSettings);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load personalization dashboard");
      setLoading(false);
    });
  }, []);

  const topCategories = useMemo(
    () => ((dashboard?.mostFollowedCategories as Record<string, unknown>[]) || []).slice(0, 8),
    [dashboard]
  );
  const topTopics = useMemo(
    () => ((dashboard?.mostFollowedTopics as Record<string, unknown>[]) || []).slice(0, 8),
    [dashboard]
  );
  const logs = useMemo(() => ((dashboard?.logs as Record<string, unknown>[]) || []).slice(0, 40), [dashboard]);

  const saveSettings = async () => {
    if (adminUser?.role !== "super_admin") return toast.error("Only super admin can update personalization settings");
    const updated = await updatePersonalizationSettingsApi(draft as Record<string, unknown>);
    setSettings(updated as PersonalizationSettings);
    setDraft(updated as PersonalizationSettings);
    toast.success("Personalization settings updated");
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="AI Personalization" actions={<span className="text-sm text-gray-500">User experience & recommendation engine controls</span>} />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Recommendation usage</p><p className="text-2xl font-bold">{String(dashboard?.recommendationUsage || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Bookmarks count</p><p className="text-2xl font-bold">{String(dashboard?.bookmarksCount || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Digest subscribers</p><p className="text-2xl font-bold">{String(dashboard?.digestSubscribers || 0)}</p></div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Recommendation CTR</p><p className="text-2xl font-bold">{String(dashboard?.recommendationCtr || 0)}%</p></div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]"><Users className="mr-1 inline h-4 w-4" />Follow Metrics</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded border p-2">Categories: {String((dashboard?.followCounts as Record<string, unknown>)?.categories || 0)}</div>
            <div className="rounded border p-2">Topics: {String((dashboard?.followCounts as Record<string, unknown>)?.topics || 0)}</div>
            <div className="rounded border p-2">Authors: {String((dashboard?.followCounts as Record<string, unknown>)?.authors || 0)}</div>
            <div className="rounded border p-2">Locations: {String((dashboard?.followCounts as Record<string, unknown>)?.locations || 0)}</div>
            <div className="rounded border p-2">Notification subscriptions: {String(dashboard?.notificationSubscriptions || 0)}</div>
          </div>
          <div className="mt-3 text-sm">
            <p className="mb-1 font-medium text-[#1a2b4c]">Most followed categories</p>
            {topCategories.map((c) => (
              <p key={String(c.key)} className="rounded border px-2 py-1">{String(c.key)} · {String(c.count)}</p>
            ))}
            {!topCategories.length && <p className="text-gray-500">No category follow data.</p>}
          </div>
          <div className="mt-3 text-sm">
            <p className="mb-1 font-medium text-[#1a2b4c]">Most followed topics</p>
            {topTopics.map((t) => (
              <p key={String(t.key)} className="rounded border px-2 py-1">{String(t.key)} · {String(t.count)}</p>
            ))}
            {!topTopics.length && <p className="text-gray-500">No topic follow data.</p>}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-[#1a2b4c]"><Settings2 className="mr-1 inline h-4 w-4" />Personalization Settings</h3>
          {settings && (
            <div className="grid gap-3 text-sm">
              <label><input type="checkbox" checked={Boolean(draft.enabled)} onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))} /> Engine enabled</label>
              <label><input type="checkbox" checked={Boolean(draft.homepageRecommendations)} onChange={(e) => setDraft((p) => ({ ...p, homepageRecommendations: e.target.checked }))} /> Homepage recommendations</label>
              <label><input type="checkbox" checked={Boolean(draft.digestEnabled)} onChange={(e) => setDraft((p) => ({ ...p, digestEnabled: e.target.checked }))} /> Digest enabled</label>
              <label><input type="checkbox" checked={Boolean(draft.smartNotifications)} onChange={(e) => setDraft((p) => ({ ...p, smartNotifications: e.target.checked }))} /> Smart notifications</label>
              <label><input type="checkbox" checked={Boolean(draft.allowAnonymousRecommendations)} onChange={(e) => setDraft((p) => ({ ...p, allowAnonymousRecommendations: e.target.checked }))} /> Anonymous recommendations</label>
              <label>Max recommendations
                <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(draft.maxRecommendations || 20)} onChange={(e) => setDraft((p) => ({ ...p, maxRecommendations: Number(e.target.value) }))} />
              </label>
              <label>Refresh interval (min)
                <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={Number(draft.recommendationRefreshInterval || 30)} onChange={(e) => setDraft((p) => ({ ...p, recommendationRefreshInterval: Number(e.target.value) }))} />
              </label>
              <button className="rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={saveSettings}>Save settings</button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-[#1a2b4c]"><RefreshCw className="mr-1 inline h-4 w-4" />Recent Personalization Logs</h3>
        <div className="space-y-2 text-sm">
          {logs.map((l) => (
            <div key={String(l.id)} className="rounded border p-2">
              <p className="font-medium">{String(l.actionType)} · {String(l.status)}</p>
              <p className="text-xs text-gray-500">{String(l.message)}</p>
            </div>
          ))}
          {!logs.length && <p className="text-gray-500">No logs yet.</p>}
        </div>
      </div>
    </RoleGuard>
  );
}
