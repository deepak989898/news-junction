"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import ToastProvider from "@/components/ui/ToastProvider";
import FaviconHead from "@/components/layout/FaviconHead";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <LanguageProvider>
          <FaviconHead />
          {children}
          <ToastProvider />
        </LanguageProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
