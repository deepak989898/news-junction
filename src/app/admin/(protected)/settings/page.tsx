"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import SettingsForm from "@/components/admin/SettingsForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getSettings, updateSettings } from "@/firebase/firestore";
import { SiteSettings } from "@/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (newSettings: SiteSettings) => {
    await updateSettings(newSettings);
    setSettings(newSettings);
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!settings) return null;

  return (
    <RoleGuard requireSuperAdmin>
      <AdminTopbar title="Website Settings" />
      <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
        <SettingsForm initialSettings={settings} onSave={handleSave} />
      </div>
    </RoleGuard>
  );
}
