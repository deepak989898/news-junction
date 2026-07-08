import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppNotificationItem } from "@/types/personalization";

export function NotificationCard({
  item,
  onPress,
  onDelete,
}: {
  item: AppNotificationItem;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className={`mb-3 rounded-2xl p-4 ${item.read ? "bg-white" : "bg-red-50"}`}>
      <AppText className="text-xs uppercase text-red-600">{item.type}</AppText>
      <AppText className="mt-1 font-semibold text-slate-900">{item.title}</AppText>
      <AppText className="mt-1 text-sm text-slate-600">{item.body}</AppText>
      {onDelete ? (
        <Pressable onPress={onDelete} className="mt-2">
          <AppText className="text-xs text-red-600">Delete</AppText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function SearchResultCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mx-4 mb-2 rounded-xl bg-white p-3 shadow-sm">
      <AppText numberOfLines={2} className="font-medium text-slate-900">
        {title}
      </AppText>
      {subtitle ? <AppText className="mt-1 text-xs text-slate-500">{subtitle}</AppText> : null}
    </Pressable>
  );
}

export function ProfileCard({
  name,
  email,
  subtitle,
}: {
  name: string;
  email?: string;
  subtitle?: string;
}) {
  return (
    <View className="items-center rounded-2xl bg-white p-6 shadow-sm">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AppText className="text-xl font-bold text-red-600">{name.charAt(0).toUpperCase()}</AppText>
      </View>
      <AppText className="mt-3 text-xl font-bold">{name}</AppText>
      {email ? <AppText className="mt-1 text-slate-500">{email}</AppText> : null}
      {subtitle ? <AppText className="mt-2 text-sm text-slate-500">{subtitle}</AppText> : null}
    </View>
  );
}
