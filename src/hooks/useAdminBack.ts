"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_NAV_KEY = "news_junction_admin_nav_stack";

function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ADMIN_NAV_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string" && p.startsWith("/admin")) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_NAV_KEY, JSON.stringify(stack.slice(-30)));
}

/** Call on each admin route change to remember navigation order */
export function trackAdminNavigation(pathname: string) {
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return;

  const stack = readStack();
  const last = stack[stack.length - 1];
  if (last !== pathname) {
    stack.push(pathname);
    writeStack(stack);
  }
}

const ADMIN_PAGE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/system-verification": "System Verification",
  "/admin/ai/content-studio": "AI Content Studio",
  "/admin/ai/seo-manager": "AI SEO Manager",
  "/admin/ai/media-studio": "AI Media Studio",
  "/admin/ai/media-studio/image-audit": "Image Audit",
  "/admin/ai/voice-video-studio": "AI Voice & Video Studio",
  "/admin/ai/analytics-manager": "AI Analytics Manager",
  "/admin/ai/operations": "AI Operations",
  "/admin/ai/social-manager": "AI Social Manager",
  "/admin/ai/editorial-manager": "AI Editorial Manager",
  "/admin/ai/personalization": "AI Personalization",
  "/admin/ai/orchestrator": "AI Orchestrator",
  "/admin/automation": "Automation",
  "/admin/automation/settings": "Automation Settings",
  "/admin/automation/queue": "Approval Queue",
  "/admin/automation/google-trends": "Google Trends",
  "/admin/automation/local-news": "Local News Automation",
  "/admin/sources": "Sources",
  "/admin/locations": "Locations",
  "/admin/analytics/location-coverage": "Location Coverage",
  "/admin/social/accounts": "Social Accounts",
  "/admin/news": "News",
  "/admin/settings": "Settings",
};

function labelForPath(path: string) {
  if (ADMIN_PAGE_LABELS[path]) return ADMIN_PAGE_LABELS[path];
  if (path.startsWith("/admin/news/") && path.endsWith("/edit")) return "Edit News";
  if (path === "/admin/news/new") return "Add News";
  const tail = path.split("/").filter(Boolean).pop() || "Admin";
  return tail.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useAdminBack() {
  const router = useRouter();
  const pathname = usePathname();

  const showBack = pathname !== "/admin" && pathname !== "/admin/login";

  const previousPath = useMemo(() => {
    const stack = readStack();
    if (stack.length < 2) return null;
    if (stack[stack.length - 1] === pathname) {
      return stack[stack.length - 2] || null;
    }
    return stack[stack.length - 1] || null;
  }, [pathname]);

  const previousLabel = previousPath ? labelForPath(previousPath) : "Dashboard";

  const goBack = useCallback(() => {
    const stack = readStack();

    if (stack.length <= 1) {
      router.push("/admin");
      return;
    }

    if (stack[stack.length - 1] === pathname) {
      stack.pop();
    }

    const target = stack[stack.length - 1] || "/admin";
    writeStack(stack);
    router.push(target);
  }, [pathname, router]);

  return { showBack, goBack, previousLabel };
}
