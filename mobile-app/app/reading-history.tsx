import { RefreshControl, View, TextInput, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/states";
import { useReadingHistory } from "@/hooks/useHistory";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useMemo, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

export default function ReadingHistoryScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const { data, isLoading, refetch, isRefetching } = useReadingHistory(80);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((h) => h.categoryName?.toLowerCase().includes(q) || h.articleId.includes(q));
  }, [data, query]);

  const continueReading = filtered.filter((h) => !h.completed && (h.progress || 0) < 0.95);
  const finished = filtered.filter((h) => h.completed);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <AppText>{t("loginRequired")}</AppText>
        <AppButton title={t("login")} className="mt-4" onPress={() => router.push("/auth/login")} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("readingHistory")} />
      <View className="px-4 pt-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchHistory")}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
        />
      </View>
      {isLoading ? (
        <AppText className="mt-6 text-center">{t("loading")}</AppText>
      ) : filtered.length ? (
        <FlashList
          data={[...continueReading, ...finished]}
          estimatedItemSize={80}
          keyExtractor={(item) => item.id || item.articleId}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable className="mx-4 mb-3 rounded-2xl bg-white p-4">
              <AppText className="font-semibold">{item.categoryName || "Article"}</AppText>
              <AppText className="mt-1 text-xs text-slate-500">
                {item.completed ? t("finished") : t("continueReading")} · {Math.round((item.progress || 0) * 100)}%
              </AppText>
            </Pressable>
          )}
          ListHeaderComponent={
            <View className="px-4 py-3">
              <AppText className="font-bold">{t("continueReading")} ({continueReading.length})</AppText>
            </View>
          }
        />
      ) : (
        <EmptyState title={t("noHistory")} />
      )}
    </View>
  );
}
