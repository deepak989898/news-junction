"use client";

import { useEffect, useState, FormEvent } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import FormInput from "@/components/admin/FormInput";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getAutomationSettingsClient, updateAutomationSettingsClient } from "@/firebase/firestore";
import { AutomationSettings } from "@/lib/automation/types";
import toast from "react-hot-toast";

export default function AutomationSettingsPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAutomationSettingsClient().then(setSettings).finally(() => setLoading(false));
  }, []);

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
          <FormInput label="Duplicate Threshold (0-1)" type="number" step="0.05" value={settings.duplicateThreshold} onChange={(e) => setSettings({ ...settings, duplicateThreshold: parseFloat(e.target.value) || 0.75 })} />
          <FormInput label="Default Author" value={settings.defaultAuthorName} onChange={(e) => setSettings({ ...settings, defaultAuthorName: e.target.value })} />
        </div>

        <ToggleSwitch
          label="Generate AI Featured Images (OpenAI)"
          checked={settings.generateAiImages !== false}
          onChange={(v) => setSettings({ ...settings, generateAiImages: v })}
          description="Creates a unique image when you approve an article. Uses OPENAI_API_KEY."
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
