import { ScrollView, Switch, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminSecurity } from "@/providers/AdminSecurityProvider";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";

function Row({
  label,
  value,
  onChange,
  readonly,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  readonly?: boolean;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-4">
      <AppText>{label}</AppText>
      <Switch value={value} onValueChange={onChange} disabled={readonly} />
    </View>
  );
}

export default function AdminSettingsScreen() {
  const security = useAdminSecurity();
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);
  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Admin Settings" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <Row label="Biometric lock for sensitive actions" value={security.biometricEnabled} onChange={security.setBiometricEnabled} />
        <Row label="AI settings (edit in web CMS)" value={false} onChange={() => {}} readonly />
        <Row label="SEO settings (edit in web CMS)" value={false} onChange={() => {}} readonly />
        <Row label="Social accounts (edit in web CMS)" value={false} onChange={() => {}} readonly />
        <Row label="Feature flags (edit in web CMS)" value={false} onChange={() => {}} readonly />
      </ScrollView>
    </View>
  );
}
