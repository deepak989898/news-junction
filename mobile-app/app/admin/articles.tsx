import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminActions, useAdminArticles, useAdminProfile } from "@/hooks/useAdmin";

const STATUSES = ["all", "draft", "published", "pending", "rejected", "archived"] as const;

export default function AdminArticlesScreen() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const profile = useAdminProfile();
  const articles = useAdminArticles(status === "all" ? undefined : status, query);
  const actions = useAdminActions();

  const items = useMemo(() => (articles.data || []) as Array<Record<string, unknown>>, [articles.data]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const bulkUpdate = async (nextStatus: "published" | "rejected" | "archived") => {
    if (!selected.length) return;
    for (const articleId of selected) {
      await actions.updateStatus.mutateAsync({ articleId, status: nextStatus });
    }
    setSelected([]);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Article Management" />
      <AdminNav />
      <View className="px-4 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search article"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            className={`mr-2 rounded-full border px-3 py-2 ${status === s ? "border-red-600 bg-red-50" : "border-slate-300 bg-white"}`}
          >
            <AppText className={`text-xs ${status === s ? "text-red-600" : "text-slate-700"}`}>{s}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View className="px-4 pb-2">
        <View className="flex-row flex-wrap gap-2">
          <AppButton title="Bulk Publish" onPress={() => bulkUpdate("published")} />
          <AppButton title="Bulk Reject" onPress={() => bulkUpdate("rejected")} />
          <AppButton title="Bulk Archive" onPress={() => bulkUpdate("archived")} />
        </View>
      </View>

      <ScrollView className="px-4 pb-8">
        {items.map((item) => {
          const id = String(item.id || "");
          const isSelected = selected.includes(id);
          return (
            <Pressable key={id} onLongPress={() => toggleSelect(id)} className={`mb-3 rounded-2xl p-4 ${isSelected ? "bg-red-50" : "bg-white"}`}>
              <AppText className="font-semibold text-slate-900">
                {String(item.titleEn || item.titleHi || "Untitled")}
              </AppText>
              <AppText className="mt-1 text-xs text-slate-500">
                Status: {String(item.status || "draft")} · Slug: {String(item.slug || "-")}
              </AppText>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <AppButton title="Publish" onPress={() => actions.updateStatus.mutate({ articleId: id, status: "published" })} />
                <AppButton title="Reject" onPress={() => actions.updateStatus.mutate({ articleId: id, status: "rejected" })} />
                <AppButton title="Archive" onPress={() => actions.updateStatus.mutate({ articleId: id, status: "archived" })} />
                {profile.data?.role === "super_admin" ? (
                  <AppButton
                    title="Delete"
                    className="bg-red-700"
                    onPress={() => Alert.alert("Delete", "Use web admin for hard delete to preserve safety checks.")}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
