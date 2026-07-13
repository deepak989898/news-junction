"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  FolderOpen,
  Rss,
  Image,
  Settings,
  Megaphone,
  LogOut,
  X,
  Bot,
  Sparkles,
  SearchCheck,
  ImagePlus,
  Share2,
  Mic2,
  ShieldCheck,
  BarChart3,
  UserRoundCog,
  Radar,
  Waypoints,
  ClipboardCheck,
  MapPin,
} from "lucide-react";
import { logoutAdmin } from "@/firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { canManageSettings, canManageAds } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "editor"] },
  { href: "/admin/news", label: "News", icon: Newspaper, roles: ["super_admin", "editor"] },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen, roles: ["super_admin", "editor"] },
  { href: "/admin/sources", label: "Sources", icon: Rss, roles: ["super_admin", "editor"] },
  { href: "/admin/automation", label: "Automation", icon: Bot, roles: ["super_admin", "editor"] },
  { href: "/admin/automation/google-trends", label: "Google Trends", icon: SearchCheck, roles: ["super_admin", "editor"] },
  { href: "/admin/automation/local-news", label: "Local News", icon: MapPin, roles: ["super_admin", "editor"] },
  { href: "/admin/locations", label: "Locations", icon: MapPin, roles: ["super_admin", "editor"] },
  { href: "/admin/analytics/location-coverage", label: "Location Coverage", icon: BarChart3, roles: ["super_admin", "editor"] },
  { href: "/admin/system-verification", label: "System Verification", icon: ClipboardCheck, roles: ["super_admin"] },
  { href: "/admin/ai/content-studio", label: "AI Content Studio", icon: Sparkles, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/seo-manager", label: "AI SEO Manager", icon: SearchCheck, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/media-studio", label: "AI Media Studio", icon: ImagePlus, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/media-studio/image-audit", label: "Image Audit", icon: Image, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/voice-video-studio", label: "AI Voice & Video Studio", icon: Mic2, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/editorial-manager", label: "AI Editorial Manager", icon: ShieldCheck, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/analytics-manager", label: "AI Analytics Manager", icon: BarChart3, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/personalization", label: "AI Personalization", icon: UserRoundCog, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/operations", label: "AI Operations", icon: Radar, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/orchestrator", label: "AI Master Orchestrator", icon: Waypoints, roles: ["super_admin", "editor"] },
  { href: "/admin/ai/social-manager", label: "AI Social Manager", icon: Share2, roles: ["super_admin", "editor"] },
  { href: "/admin/social/accounts", label: "Social Accounts", icon: Share2, roles: ["super_admin", "editor"] },
  { href: "/admin/media", label: "Media", icon: Image, roles: ["super_admin", "editor"] },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, roles: ["super_admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser } = useAuth();

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
  };

  const visibleItems = navItems.filter((item) => {
    if (!adminUser) return false;
    if (item.href === "/admin/settings") return canManageSettings(adminUser.role);
    if (item.href === "/admin/ads") return canManageAds(adminUser.role);
    return item.roles.includes(adminUser.role);
  });

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 p-6">
        <div>
          <h1 className="text-lg font-bold">
            <span className="text-white">NEWS </span>
            <span className="text-[#c41e20]">JUNCTION</span>
          </h1>
          <p className="mt-1 text-xs text-gray-400">Admin CMS</p>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="text-gray-400 lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#c41e20] text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-[#1a2b4c] text-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-[#1a2b4c] text-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
