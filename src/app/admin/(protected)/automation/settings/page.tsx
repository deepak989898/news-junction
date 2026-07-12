"use client";

import { useEffect, useState, FormEvent } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import FormInput from "@/components/admin/FormInput";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAutomationSettingsClient, updateAutomationSettingsClient } from "@/firebase/firestore";
import { AutomationSettings } from "@/lib/automation/types";
import { getAuthToken } from "@/lib/automation/client-api";
import toast from "react-hot-toast";

type CronSetup = {
  configured: boolean;
  secretPreview?: string;
  secretLength?: number;
  urls?: { autoPublishCycle: string; autoPublishCycleForce: string; processSocialQueue: string };
  message?: string;
};

export default function AutomationSettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cronSetup, setCronSetup] = useState<CronSetup | null>(null);
  const [cronTesting, setCronTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, token] = await Promise.all([
          getAutomationSettingsClient(),
          getAuthToken(),
        ]);
        setSettings(s);
        if (token) {
          const res = await fetch("/api/admin/automation/cron-setup", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = (await res.json()) as CronSetup;
          setCronSetup(data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyCronUrl = async () => {
    const url = cronSetup?.urls?.autoPublishCycle;
    if (!url) return toast.error("Cron URL not available");
    await navigator.clipboard.writeText(url);
    toast.success("Exact cron URL copied — paste in cron-job.org");
  };

  const testCronFromServer = async () => {
    setCronTesting(true);
    const toastId = toast.loading("Testing auto-publish with server CRON_SECRET...");
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not logged in");
      const res = await fetch("/api/admin/automation/cron-test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      toast.success(
        `Cron works! Published: ${data.published ?? 0}, Processed: ${data.processed ?? data.process?.processed ?? 0}`,
        { id: toastId, duration: 8000 }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cron test failed", { id: toastId });
    } finally {
      setCronTesting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateAutomationSettingsClient(settings);
      toast.success("Automation settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard requireSuperAdmin>
      <AdminTopbar title="Automation Settings" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <ToggleSwitch
          label="Automation Enabled"
          checked={settings.automationEnabled}
          onChange={(v) => setSettings({ ...settings, automationEnabled: v })}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">AI Provider</label>
          <select
            value={settings.aiProvider}
            onChange={(e) => setSettings({ ...settings, aiProvider: e.target.value as "openai" | "gemini" })}
            className="w-full rounded-lg border px-4 py-2.5 text-sm"
          >
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Max Articles Per Day" type="number" value={settings.maxArticlesPerDay} onChange={(e) => setSettings({ ...settings, maxArticlesPerDay: parseInt(e.target.value) || 0 })} />
          <FormInput label="Max Per Category Per Day" type="number" value={settings.maxArticlesPerCategoryPerDay} onChange={(e) => setSettings({ ...settings, maxArticlesPerCategoryPerDay: parseInt(e.target.value) || 0 })} />
          <FormInput label="Publish Interval (minutes)" type="number" value={settings.publishIntervalMinutes ?? 30} onChange={(e) => setSettings({ ...settings, publishIntervalMinutes: parseInt(e.target.value) || 30 })} />
          <FormInput label="Articles Per Cron Run" type="number" value={settings.processBatchSizePerRun ?? 1} onChange={(e) => setSettings({ ...settings, processBatchSizePerRun: parseInt(e.target.value) || 1 })} />
          <FormInput label="Duplicate Threshold (0-1)" type="number" step="0.05" value={settings.duplicateThreshold} onChange={(e) => setSettings({ ...settings, duplicateThreshold: parseFloat(e.target.value) || 0.75 })} />
          <FormInput label="Default Author" value={settings.defaultAuthorName} onChange={(e) => setSettings({ ...settings, defaultAuthorName: e.target.value })} />
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">cron-job.org setup (30-minute auto publish)</p>
          {!cronSetup?.configured ? (
            <p className="mt-2 font-medium text-red-700">
              {cronSetup?.message || "CRON_SECRET not set on Vercel — add it and redeploy."}
            </p>
          ) : (
            <>
              <p className="mt-2">
                Vercel CRON_SECRET: <strong>{cronSetup.secretPreview}</strong> ({cronSetup.secretLength} chars)
              </p>
              <p className="mt-2 font-medium">Copy this exact URL into cron-job.org (no headers needed):</p>
              <p className="mt-1 break-all rounded border bg-white p-2 text-xs">{cronSetup.urls?.autoPublishCycle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={copyCronUrl} className="rounded bg-[#1a2b4c] px-3 py-1.5 text-xs font-bold text-white">
                  Copy Cron URL
                </button>
                <button type="button" onClick={testCronFromServer} disabled={cronTesting} className="rounded border px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                  {cronTesting ? "Testing..." : "Test Auto-Publish Now"}
                </button>
              </div>
              <p className="mt-2 text-xs text-red-700">
                Do not type the secret manually — use Copy Cron URL. Wrong secret = 401 Unauthorized.
              </p>
            </>
          )}
          <p className="mt-2">Schedule: every 30 minutes · Method: GET · Headers: leave empty</p>
          <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <strong>If test run times out:</strong> cron-job.org → ADVANCED → increase <strong>Request timeout to 90 seconds</strong>.
            Vercel allows max 60s; we optimized the cycle to finish faster (skip fetch when queue has items, use RSS image first).
          </p>
        </div>

        <ToggleSwitch
          label="Generate AI Featured Images (OpenAI)"
          checked={settings.generateAiImages !== false}
          onChange={(v) => setSettings({ ...settings, generateAiImages: v })}
          description="High-quality 16:9 WebP hero images matched to article headline. Uses OPENAI_API_KEY."
        />

        <FormInput label="Default Category Image URL" value={settings.defaultCategoryImage} onChange={(e) => setSettings({ ...settings, defaultCategoryImage: e.target.value })} />
        <FormInput label="Default Source Credit Text" value={settings.defaultSourceCreditText} onChange={(e) => setSettings({ ...settings, defaultSourceCreditText: e.target.value })} />

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-700">Auto Publish Rules</h4>
          <ToggleSwitch label="Auto Publish Low Risk" checked={settings.autoPublishLowRisk} onChange={(v) => setSettings({ ...settings, autoPublishLowRisk: v })} />
          <ToggleSwitch label="Auto Publish Medium Risk" checked={settings.autoPublishMediumRisk} onChange={(v) => setSettings({ ...settings, autoPublishMediumRisk: v })} />
          <ToggleSwitch label="High Risk Always Needs Approval" checked={settings.highRiskAlwaysApproval} onChange={(v) => setSettings({ ...settings, highRiskAlwaysApproval: v })} />
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-[#c41e20] px-8 py-3 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </RoleGuard>
  );
}
