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
  Bell,
  Mail,
  ListChecks,
  Cog,
  type LucideIcon,
} from "lucide-react";
import { logoutAdmin } from "@/firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { canManageSettings, canManageAds } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

type NavGroup = {
  id: string;
  title: string;
  /** Short hint so admins know when to open this section */
  hint: string;
  accent?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    hint: "Start here",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "editor"] }],
  },
  {
    id: "daily",
    title: "Daily work",
    hint: "Check every day",
    accent: "#f59e0b",
    items: [
      { href: "/admin/news", label: "News", icon: Newspaper, roles: ["super_admin", "editor"] },
      {
        href: "/admin/automation/queue",
        label: "Approval queue",
        icon: ListChecks,
        roles: ["super_admin", "editor"],
      },
      { href: "/admin/automation", label: "Automation", icon: Bot, roles: ["super_admin", "editor"] },
      {
        href: "/admin/automation/google-trends",
        label: "Google Trends",
        icon: SearchCheck,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/notifications",
        label: "Push notifications",
        icon: Bell,
        roles: ["super_admin", "editor"],
      },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail, roles: ["super_admin", "editor"] },
    ],
  },
  {
    id: "action",
    title: "Needs your action",
    hint: "Review & approve",
    accent: "#c41e20",
    items: [
      {
        href: "/admin/ai/editorial-manager",
        label: "AI editorial review",
        icon: ShieldCheck,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/media-studio/image-audit",
        label: "Image audit",
        icon: Image,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/trust/inbox",
        label: "Contact & corrections",
        icon: Mail,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/trust",
        label: "Trust & policies",
        icon: ShieldCheck,
        roles: ["super_admin", "editor"],
      },
    ],
  },
  {
    id: "ai-tools",
    title: "AI tools",
    hint: "Create & improve content",
    items: [
      {
        href: "/admin/ai/content-studio",
        label: "AI content studio",
        icon: Sparkles,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/seo-manager",
        label: "AI SEO manager",
        icon: SearchCheck,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/media-studio",
        label: "AI media studio",
        icon: ImagePlus,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/voice-video-studio",
        label: "AI voice & video",
        icon: Mic2,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/social-manager",
        label: "AI social manager",
        icon: Share2,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/analytics-manager",
        label: "AI analytics",
        icon: BarChart3,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/ai/personalization",
        label: "AI personalization",
        icon: UserRoundCog,
        roles: ["super_admin", "editor"],
      },
      { href: "/admin/ai/operations", label: "AI operations", icon: Radar, roles: ["super_admin", "editor"] },
      {
        href: "/admin/ai/orchestrator",
        label: "AI orchestrator",
        icon: Waypoints,
        roles: ["super_admin", "editor"],
      },
    ],
  },
  {
    id: "site",
    title: "Site setup",
    hint: "Configure & maintain",
    items: [
      { href: "/admin/categories", label: "Categories", icon: FolderOpen, roles: ["super_admin", "editor"] },
      { href: "/admin/sources", label: "News sources", icon: Rss, roles: ["super_admin", "editor"] },
      { href: "/admin/media", label: "Media library", icon: Image, roles: ["super_admin", "editor"] },
      { href: "/admin/locations", label: "Locations", icon: MapPin, roles: ["super_admin", "editor"] },
      {
        href: "/admin/analytics/location-coverage",
        label: "Location coverage",
        icon: BarChart3,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/social/accounts",
        label: "Social accounts",
        icon: Share2,
        roles: ["super_admin", "editor"],
      },
      {
        href: "/admin/automation/settings",
        label: "Automation settings",
        icon: Cog,
        roles: ["super_admin", "editor"],
      },
    ],
  },
  {
    id: "admin",
    title: "Admin & system",
    hint: "Owner / super admin",
    accent: "#94a3b8",
    items: [
      { href: "/admin/ads", label: "Ads", icon: Megaphone, roles: ["super_admin"] },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
      {
        href: "/admin/system-verification",
        label: "System verification",
        icon: ClipboardCheck,
        roles: ["super_admin"],
      },
    ],
  },
];

function flattenNavItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

/** Highlight only the most specific nav item — avoids parent + child both active */
function getActiveNavHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;

  for (const item of items) {
    const matches =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (matches && (!best || item.href.length > best.length)) {
      best = item.href;
    }
  }

  return best;
}

function canSeeItem(item: NavItem, role: UserRole | undefined): boolean {
  if (!role) return false;
  if (item.href === "/admin/settings") return canManageSettings(role);
  if (item.href === "/admin/ads") return canManageAds(role);
  return item.roles.includes(role);
}

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await logoutAdmin();
    router.push("/admin/login");
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeItem(item, adminUser?.role)),
    }))
    .filter((group) => group.items.length > 0);

  const allVisibleItems = flattenNavItems(visibleGroups);
  const activeHref = getActiveNavHref(pathname, allVisibleItems);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div>
          <h1 className="text-sm font-bold leading-tight">
            <span className="text-white">NEWS </span>
            <span className="text-[#c41e20]">JUNCTION</span>
          </h1>
          <p className="text-[10px] text-gray-400">Admin CMS</p>
        </div>
        {onMobileClose && (
          <button type="button" onClick={onMobileClose} className="text-gray-400 lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {visibleGroups.map((group, groupIndex) => {
          const groupHasActive = group.items.some((item) => item.href === activeHref);
          const isCollapsed = collapsedGroups[group.id] === true && !groupHasActive;

          return (
            <div
              key={group.id}
              className={cn(groupIndex > 0 && "mt-3 border-t border-white/10 pt-3")}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="mb-1 flex w-full items-start gap-2 rounded-md px-2.5 py-1 text-left transition-colors hover:bg-white/5"
                aria-expanded={!isCollapsed}
              >
                {group.accent ? (
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: group.accent }}
                    aria-hidden
                  />
                ) : (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/25" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[10px] font-bold uppercase tracking-wider",
                      groupHasActive ? "text-white" : "text-gray-300"
                    )}
                  >
                    {group.title}
                  </span>
                  <span className="block text-[9px] leading-tight text-gray-500">{group.hint}</span>
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.href === activeHref;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileClose}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 pl-5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-[#c41e20] text-white"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col bg-[#1a2b4c] text-white lg:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-56 flex-col bg-[#1a2b4c] text-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
