"use client";

import { useEffect, useState } from "react";
import { Link2, Link2Off, Shield, RefreshCw } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { connectSocialAccountApi, disconnectSocialAccountApi } from "@/lib/ai-social/client-api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const PLATFORMS = [
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "telegram",
  "whatsapp_channel",
  "youtube_community",
] as const;

export default function SocialAccountsPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({
    platform: "facebook",
    accountName: "",
    accountId: "",
    token: "",
    refreshToken: "",
    tokenExpiresAt: "",
    scopes: "",
  });

  const load = async () => {
    const token = await (await import("@/lib/automation/client-api")).getAuthToken();
    const res = await fetch("/api/ai/social/accounts", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAccounts(data.accounts || []);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load accounts");
      setLoading(false);
    });
  }, []);

  const connect = async () => {
    if (adminUser?.role !== "superAdmin") {
      toast.error("Only superAdmin can connect accounts");
      return;
    }
    try {
      await connectSocialAccountApi({
        platform: form.platform,
        accountName: form.accountName,
        accountId: form.accountId || undefined,
        token: form.token,
        refreshToken: form.refreshToken || undefined,
        tokenExpiresAt: form.tokenExpiresAt || undefined,
        scopes: form.scopes ? form.scopes.split(",").map((x) => x.trim()).filter(Boolean) : [],
      });
      toast.success("Account connected");
      setForm((p) => ({ ...p, token: "", refreshToken: "" }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect failed");
    }
  };

  const disconnect = async (platform: string) => {
    if (adminUser?.role !== "superAdmin") {
      toast.error("Only superAdmin can disconnect");
      return;
    }
    await disconnectSocialAccountApi(platform);
    toast.success("Disconnected");
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar title="Social Accounts" actions={<span className="text-sm text-gray-500">Official API account connections</span>} />

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#1a2b4c]"><Shield size={16} /> Connect Account</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Platform
            <select className="mt-1 w-full rounded border px-2 py-1" value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm">Account Name
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} />
          </label>
          <label className="text-sm">Account ID (optional)
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.accountId} onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))} />
          </label>
          <label className="text-sm">Access Token
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.token} onChange={(e) => setForm((p) => ({ ...p, token: e.target.value }))} />
          </label>
          <label className="text-sm">Refresh Token (optional)
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.refreshToken} onChange={(e) => setForm((p) => ({ ...p, refreshToken: e.target.value }))} />
          </label>
          <label className="text-sm">Token Expires At (ISO)
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.tokenExpiresAt} onChange={(e) => setForm((p) => ({ ...p, tokenExpiresAt: e.target.value }))} />
          </label>
          <label className="text-sm md:col-span-2 lg:col-span-3">Scopes (comma-separated)
            <input className="mt-1 w-full rounded border px-2 py-1" value={form.scopes} onChange={(e) => setForm((p) => ({ ...p, scopes: e.target.value }))} />
          </label>
        </div>
        <button className="mt-4 rounded bg-[#1a2b4c] px-4 py-2 text-sm font-bold text-white" onClick={connect}>
          <Link2 className="mr-1 inline h-4 w-4" /> Connect / Reconnect
        </button>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a2b4c]">Connection Status</h3>
          <button className="rounded border px-3 py-1 text-xs" onClick={load}><RefreshCw className="mr-1 inline h-3 w-3" />Refresh</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500"><th className="py-2">Platform</th><th>Account</th><th>Status</th><th>Enabled</th><th>Last Checked</th><th>Action</th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className="py-2">{String(a.platform)}</td>
                  <td>{String(a.accountName)}</td>
                  <td>{String(a.status)}</td>
                  <td>{String(a.enabled ? "Yes" : "No")}</td>
                  <td>{String(a.lastCheckedAt || "-")}</td>
                  <td>
                    <button className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => disconnect(String(a.platform))}>
                      <Link2Off className="mr-1 inline h-3 w-3" /> Disconnect
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-400">No social accounts connected</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
