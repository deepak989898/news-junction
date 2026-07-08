import { View } from "react-native";
import { Link } from "expo-router";
import { AppText } from "@/components/ui/AppText";

const links = [
  { href: "/(drawer)/notification-settings", label: "Notification Settings" },
  { href: "/(drawer)/language-settings", label: "Language Settings" },
  { href: "/(drawer)/theme-settings", label: "Theme Settings" },
  { href: "/(drawer)/about", label: "About" },
  { href: "/(drawer)/privacy", label: "Privacy Policy" },
  { href: "/(drawer)/terms", label: "Terms" },
  { href: "/(drawer)/help", label: "Help" },
];

export default function SettingsRootScreen() {
  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <AppText className="text-2xl font-bold">Settings</AppText>
      <View className="mt-4 gap-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href as never} className="rounded-lg border border-slate-300 px-3 py-3">
            {item.label}
          </Link>
        ))}
      </View>
    </View>
  );
}
