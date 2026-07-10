import { ScrollView, Pressable } from "react-native";
import { router, usePathname } from "expo-router";
import { AppText } from "@/components/ui/AppText";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/ai-tools", label: "AI Tools" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/orchestrator", label: "Orchestrator" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/search", label: "Search" },
  { href: "/admin/offline-queue", label: "Offline Queue" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/users", label: "Users" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
      {LINKS.map((link) => (
        <Pressable
          key={link.href}
          onPress={() => router.push(link.href as never)}
          className={`mr-2 rounded-full border px-3 py-2 ${pathname === link.href ? "border-red-600 bg-red-50" : "border-slate-300 bg-white"}`}
        >
          <AppText className={`text-xs ${pathname === link.href ? "font-semibold text-red-600" : "text-slate-700"}`}>
            {link.label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
