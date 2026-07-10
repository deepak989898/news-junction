import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AdminNav } from "@/components/admin/AdminNav";
import { useGlobalAdminSearch } from "@/hooks/useAdmin";

export default function AdminSearchScreen() {
  const [query, setQuery] = useState("");
  const search = useGlobalAdminSearch(query);

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Global Admin Search" />
      <AdminNav />
      <View className="px-4 pb-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search articles, users, categories, logs..."
          className="rounded-xl border border-slate-300 bg-white px-3 py-2"
        />
      </View>
      <ScrollView className="px-4 pb-8">
        {(search.data || []).map((item, idx) => (
          <View key={`${idx}-${String(item.id || "")}`} className="mb-2 rounded-xl bg-white p-3">
            <AppText className="text-xs uppercase text-red-600">{String(item.type || "result")}</AppText>
            <AppText className="mt-1 font-semibold text-slate-900">
              {String(item.titleEn || item.titleHi || item.name || item.email || item.message || item.id)}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
