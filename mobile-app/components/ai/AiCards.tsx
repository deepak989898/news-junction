import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";

export function AiWidgetCard({
  greeting,
  topCount,
}: {
  greeting: "morning" | "afternoon" | "evening";
  topCount: number;
}) {
  const greetLabel =
    greeting === "morning" ? "Good Morning" : greeting === "afternoon" ? "Good Afternoon" : "Good Evening";
  return (
    <Pressable onPress={() => router.push("/ai")} className="mx-4 mb-4 rounded-3xl bg-slate-900 p-4">
      <AppText className="text-xs uppercase text-red-300">AI Center</AppText>
      <AppText className="mt-1 text-lg font-bold text-white">{greetLabel}</AppText>
      <AppText className="mt-1 text-sm text-slate-300">Today's Top Stories: {topCount}</AppText>
      <AppText className="mt-3 text-sm font-semibold text-red-300">Open Assistant</AppText>
    </Pressable>
  );
}

export function AiShortcutRow() {
  const items = [
    { key: "summary", label: "Quick Summary", href: "/ai?action=summary" },
    { key: "brief", label: "60s Brief", href: "/ai?action=brief_60" },
    { key: "search", label: "Smart Search", href: "/ai?action=search" },
    { key: "digest", label: "Daily Digest", href: "/ai?action=digest" },
    { key: "voice", label: "Voice", href: "/ai?action=voice" },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => router.push(item.href as never)}
          className="mr-2 rounded-full border border-slate-300 bg-white px-4 py-2"
        >
          <AppText className="text-xs font-semibold text-slate-700">{item.label}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function AiSectionCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <AppText className="font-semibold text-slate-900">{title}</AppText>
      <AppText className="mt-1 text-sm text-slate-600">{subtitle}</AppText>
    </Pressable>
  );
}
