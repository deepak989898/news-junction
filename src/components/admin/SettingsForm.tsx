"use client";

import { SiteSettings } from "@/types";
import { uploadSiteAsset } from "@/firebase/storage";
import FormInput from "./FormInput";
import FormTextarea from "./FormTextarea";
import ToggleSwitch from "./ToggleSwitch";
import Image from "next/image";
import toast from "react-hot-toast";
import { useState, FormEvent, ChangeEvent } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SITE_FAVICON_URL } from "@/components/layout/FaviconHead";

interface SettingsFormProps {
  initialSettings: SiteSettings;
  onSave: (settings: SiteSettings) => Promise<void>;
}

export default function SettingsForm({ initialSettings, onSave }: SettingsFormProps) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "seo" | "social" | "ads">("general");

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (key: keyof SiteSettings["socialLinks"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  };

  const handleAssetUpload = async (file: File, type: "logo" | "favicon") => {
    setUploading(type);
    try {
      const url = await uploadSiteAsset(file, type);
      setSettings((prev) => ({
        ...prev,
        [type === "logo" ? "logoUrl" : "faviconUrl"]: url,
      }));
      toast.success(`${type} uploaded`);
    } catch {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "general" as const, label: "General" },
    { id: "seo" as const, label: "SEO" },
    { id: "social" as const, label: "Social" },
    { id: "ads" as const, label: "Ads" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#c41e20] text-[#c41e20]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-4">
          <FormInput label="Site Name" name="siteName" value={settings.siteName} onChange={handleChange} />
          <FormInput label="Contact Email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} type="email" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Default Language</label>
            <select name="defaultLanguage" value={settings.defaultLanguage} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm">
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>
          </div>
          <FormTextarea label="Footer Text" name="footerText" value={settings.footerText} onChange={handleChange} rows={2} />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Logo</label>
              {settings.logoUrl && (
                <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                  <Image src={settings.logoUrl} alt="Logo" fill className="object-cover p-0.5" sizes="64px" />
                </div>
              )}
              <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-[#1a2b4c]">
                {uploading === "logo" ? <LoadingSpinner size="sm" /> : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], "logo")} />
              </label>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Favicon (browser tab)</label>
              <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
                <Image src={SITE_FAVICON_URL} alt="Favicon" fill className="object-contain p-1.5" sizes="64px" unoptimized />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Browser tab uses round NJ favicon: <code className="rounded bg-gray-100 px-1">/favicon-96.png</code>
              </p>
              {settings.faviconUrl && settings.faviconUrl !== "/favicon-96.png" && (
                <p className="mt-1 text-xs text-amber-700">Stored custom URL is not used for the tab icon.</p>
              )}
              <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-[#1a2b4c]">
                {uploading === "favicon" ? <LoadingSpinner size="sm" /> : "Upload Favicon"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], "favicon")} />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === "seo" && (
        <div className="space-y-4">
          <FormInput label="Meta Title" name="metaTitle" value={settings.metaTitle} onChange={handleChange} />
          <FormTextarea label="Meta Description" name="metaDescription" value={settings.metaDescription} onChange={handleChange} rows={3} />
          <FormInput label="Google Analytics ID" name="googleAnalyticsId" value={settings.googleAnalyticsId} onChange={handleChange} placeholder="G-XXXXXXXXXX" />
          <FormInput label="Google Search Console Verification" name="googleSearchConsoleVerification" value={settings.googleSearchConsoleVerification} onChange={handleChange} />
        </div>
      )}

      {activeTab === "social" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(["facebook", "instagram", "x", "youtube", "whatsapp"] as const).map((key) => (
            <FormInput
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={settings.socialLinks[key]}
              onChange={(e) => handleSocialChange(key, e.target.value)}
              placeholder={`https://${key}.com/...`}
            />
          ))}
        </div>
      )}

      {activeTab === "ads" && (
        <div className="space-y-4">
          <ToggleSwitch
            label="Enable Ads"
            checked={settings.adsEnabled}
            onChange={(v) => setSettings((p) => ({ ...p, adsEnabled: v }))}
            description="Show ad placeholders on the frontend when active ad slots exist"
          />
          <p className="text-sm text-gray-500">
            Manage individual ad slots in the <strong>Ads</strong> section. Google AdSense integration ready for Phase 3.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#c41e20] px-8 py-3 text-sm font-bold text-white hover:bg-[#a01820] disabled:opacity-50"
      >
        {saving ? "Saving..." : "सेव करें / Save Settings"}
      </button>
    </form>
  );
}
