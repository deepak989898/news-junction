"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link2,
  Link2Off,
  RefreshCw,
  Share2,
  Send,
  Camera,
  MessageSquare,
  Briefcase,
  MessageCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  connectTelegramBotApi,
  disconnectSocialAccountApi,
  getFacebookSetupApi,
  getSocialOAuthConfigApi,
  startFacebookOAuthApi,
} from "@/lib/ai-social/client-api";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type SocialAccountRow = {
  id?: string;
  platform: string;
  accountName: string;
  status: string;
  enabled: boolean;
  lastCheckedAt?: string;
};

type PlatformConfig = {
  platform: string;
  oneClick: boolean;
  ready: boolean;
  label: string;
  description: string;
  missing: string[];
};

const PLATFORM_ICONS: Record<string, typeof Share2> = {
  facebook: Share2,
  telegram: Send,
  instagram: Camera,
  x: MessageSquare,
  linkedin: Briefcase,
  whatsapp_channel: MessageCircle,
  youtube_community: Play,
};

export default function SocialAccountsPage() {
  const { adminUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountRow[]>([]);
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>([]);
  const [telegramToken, setTelegramToken] = useState("");
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [fbSetup, setFbSetup] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    const token = await (await import("@/lib/automation/client-api")).getAuthToken();
    const [accountsRes, configRes, setupRes] = await Promise.all([
      fetch("/api/ai/social/accounts", { headers: { Authorization: `Bearer ${token}` } }),
      getSocialOAuthConfigApi(),
      getFacebookSetupApi().catch(() => null),
    ]);
    const accountsData = await accountsRes.json();
    setAccounts(accountsData.accounts || []);
    setPlatformConfigs((configRes.platforms || []) as PlatformConfig[]);
    if (setupRes) setFbSetup(setupRes);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load accounts");
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const message = params.get("message");
    const platform = params.get("platform");
    if (!status) return;

    if (status === "success") {
      toast.success(message || `${platform} connected successfully`);
      load().catch(() => undefined);
    } else if (status === "error") {
      toast.error(message || `${platform} connection failed`);
    }

    window.history.replaceState({}, "", "/admin/social/accounts");
  }, [load]);

  const accountByPlatform = useMemo(() => {
    const map = new Map<string, SocialAccountRow>();
    accounts.forEach((a) => map.set(a.platform, a));
    return map;
  }, [accounts]);

  const connectFacebook = async () => {
    if (adminUser?.role !== "super_admin") {
      toast.error("Only super admin can connect accounts");
      return;
    }
    setConnecting("facebook");
    try {
      const { url } = await startFacebookOAuthApi();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Facebook connect failed");
      setConnecting(null);
    }
  };

  const connectTelegram = async () => {
    if (adminUser?.role !== "super_admin") {
      toast.error("Only super admin can connect accounts");
      return;
    }
    if (!telegramToken.trim()) {
      toast.error("Paste your bot token from @BotFather");
      return;
    }
    setConnecting("telegram");
    try {
      const result = await connectTelegramBotApi(telegramToken.trim());
      toast.success(`Connected ${result.accountName} → ${result.channelTitle}`);
      setTelegramToken("");
      setShowTelegramModal(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Telegram connect failed");
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (platform: string) => {
    if (adminUser?.role !== "super_admin") {
      toast.error("Only super admin can disconnect");
      return;
    }
    await disconnectSocialAccountApi(platform);
    toast.success("Disconnected");
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="Social Accounts"
        actions={<span className="text-sm text-gray-500">One-click official API connections</span>}
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Facebook setup required in Meta Dashboard:</strong> App must include the{" "}
        <em>Manage everything on your Page</em> use case + Facebook Login for Business configuration.
        If you see &quot;Invalid Scopes&quot;, create a new <strong>Business</strong> Meta app (see docs below).
      </div>

      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Quick connect:</strong> Facebook = authorize your Page via Meta OAuth (Pages API token). Telegram = paste bot
        token once (auto-verified).
        {fbSetup && (
          <div className="mt-3 rounded border border-blue-200 bg-white p-3 text-xs text-gray-800">
            <p>
              <strong>App ID:</strong> {String(fbSetup.appId || "missing")} |{" "}
              <strong>Config ID:</strong> {fbSetup.hasConfigId ? String(fbSetup.configIdPreview) : "missing"}
              {fbSetup.configIdLooksLikeAppId ? (
                <span className="ml-2 font-bold text-red-600">Config ID = App ID (wrong!)</span>
              ) : null}
            </p>
            <p className="mt-1 break-all">
              <strong>Redirect URI (Meta me exactly ye paste karo):</strong>{" "}
              <code>{String(fbSetup.redirectUri || "")}</code>
            </p>
            <p className="mt-1">
              <strong>OAuth mode:</strong> {String(fbSetup.oauthMode || "config_id")}
              {fbSetup.oauthMode === "config_id" ? (
                <span className="text-gray-600"> — agar error aaye to Vercel me FACEBOOK_OAUTH_USE_SCOPES=true set karo</span>
              ) : null}
            </p>
            {Array.isArray(fbSetup.missingEnv) && (fbSetup.missingEnv as string[]).length > 0 && (
              <p className="mt-1 text-red-600">Missing Vercel env: {(fbSetup.missingEnv as string[]).join(", ")}</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platformConfigs.map((cfg) => {
          const Icon = PLATFORM_ICONS[cfg.platform] || Link2;
          const connected = accountByPlatform.get(cfg.platform);
          const isConnected = connected?.enabled && connected?.status === "connected";

          return (
            <div key={cfg.platform} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-[#1a2b4c]" />
                  <h3 className="font-semibold text-[#1a2b4c]">{cfg.label}</h3>
                </div>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    Not connected
                  </span>
                )}
              </div>

              <p className="mb-3 text-sm text-gray-600">{cfg.description}</p>

              {isConnected && (
                <p className="mb-3 text-sm font-medium text-gray-800">{connected.accountName}</p>
              )}

              {!cfg.oneClick && cfg.platform !== "instagram" && (
                <p className="mb-3 text-xs text-amber-700">Posting OAuth coming soon. Captions still work.</p>
              )}

              {cfg.platform === "instagram" && !isConnected && (
                <p className="mb-3 text-xs text-gray-500">Instagram posting is not enabled yet (requires App Review).</p>
              )}

              {cfg.missing.length > 0 && cfg.oneClick && (
                <p className="mb-3 text-xs text-red-600">
                  Missing env: {cfg.missing.join(", ")} — add in Vercel and redeploy.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {cfg.platform === "facebook" && (
                  <button
                    className="rounded bg-[#1877F2] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={!cfg.ready || connecting === "facebook"}
                    onClick={connectFacebook}
                  >
                    <Share2 className="mr-1 inline h-4 w-4" />
                    {connecting === "facebook" ? "Redirecting..." : isConnected ? "Reconnect Page" : "Authorize Facebook Page"}
                  </button>
                )}

                {cfg.platform === "telegram" && (
                  <button
                    className="rounded bg-[#0088cc] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={!cfg.ready || connecting === "telegram"}
                    onClick={() => setShowTelegramModal(true)}
                  >
                    <Send className="mr-1 inline h-4 w-4" />
                    {isConnected ? "Reconnect Telegram" : "Connect Telegram"}
                  </button>
                )}

                {isConnected && (
                  <button
                    className="rounded border border-red-200 px-3 py-2 text-sm text-red-600"
                    onClick={() => disconnect(cfg.platform)}
                  >
                    <Link2Off className="mr-1 inline h-4 w-4" /> Disconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-[#1a2b4c]">Connect Telegram Channel</h3>
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-gray-700">
              <li>
                Open{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  @BotFather
                </a>{" "}
                and create a bot (<ExternalLink className="inline h-3 w-3" />)
              </li>
              <li>Add the bot as <strong>Admin</strong> to your Telegram channel</li>
              <li>Paste the bot token below — we verify channel access automatically</li>
            </ol>
            <input
              className="mb-4 w-full rounded border px-3 py-2 text-sm"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="rounded border px-4 py-2 text-sm" onClick={() => setShowTelegramModal(false)}>
                Cancel
              </button>
              <button
                className="rounded bg-[#0088cc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={connecting === "telegram"}
                onClick={connectTelegram}
              >
                {connecting === "telegram" ? "Verifying..." : "Connect Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-[#1a2b4c]">Connection Status</h3>
          <button className="rounded border px-3 py-1 text-xs" onClick={load}>
            <RefreshCw className="mr-1 inline h-3 w-3" />
            Refresh
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">Platform</th>
                <th>Account</th>
                <th>Status</th>
                <th>Enabled</th>
                <th>Last Checked</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={String(a.id || a.platform)} className="border-b">
                  <td className="py-2 capitalize">{a.platform.replace(/_/g, " ")}</td>
                  <td>{a.accountName}</td>
                  <td>
                    {a.status === "connected" ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 size={14} /> connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertCircle size={14} /> {a.status}
                      </span>
                    )}
                  </td>
                  <td>{a.enabled ? "Yes" : "No"}</td>
                  <td>{a.lastCheckedAt || "-"}</td>
                  <td>
                    <button
                      className="rounded border px-2 py-1 text-xs text-red-600"
                      onClick={() => disconnect(a.platform)}
                    >
                      <Link2Off className="mr-1 inline h-3 w-3" /> Disconnect
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No social accounts connected — use the buttons above
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
