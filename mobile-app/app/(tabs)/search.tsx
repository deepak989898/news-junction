import { useState } from "react";
import { View, TextInput, ScrollView, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { useSearchNews, useTrendingSearches } from "@/hooks/useSearch";
import { useCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { addRecentSearch, getRecentSearches, clearRecentSearches } from "@/services/storage/reader-storage";
import { useEffect } from "react";
import { EmptyState } from "@/components/states";

export default function SearchScreen() {
  const { t, language } = useI18n();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [recent, setRecent] = useState<string[]>([]);
  const { data: categories } = useCategories();
  const { data: results, isLoading } = useSearchNews(query, categoryId);
  const { data: trending } = useTrendingSearches();

  useEffect(() => {
    getRecentSearches().then(setRecent);
  }, []);

  const submitSearch = async (term: string) => {
    setQuery(term);
    await addRecentSearch(term);
    setRecent(await getRecentSearches());
  };

  return (
    <View className="flex-1 bg-slate-50 pt-14">
      <View className="px-4">
        <AppText className="text-2xl font-bold">{t("search")}</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => submitSearch(query)}
          placeholder={language === "hi" ? "खबरें खोजें..." : "Search news..."}
          className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
          returnKeyType="search"
        />
        <Pressable className="mt-2 rounded-xl border border-dashed border-slate-300 px-4 py-2">
          <AppText className="text-center text-sm text-slate-500">{t("voiceSearchPlaceholder")}</AppText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 px-4">
        <Chip label={t("all")} active={!categoryId} onPress={() => setCategoryId(undefined)} />
        {(categories || []).map((c) => (
          <Chip
            key={c.id}
            label={language === "hi" ? c.nameHi : c.nameEn}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </ScrollView>

      {query.trim().length < 2 ? (
        <ScrollView className="mt-4 px-4">
          <View className="mb-2 flex-row items-center justify-between">
            <AppText className="font-semibold">{t("recentSearches")}</AppText>
            <Pressable onPress={() => clearRecentSearches().then(() => setRecent([]))}>
              <AppText className="text-sm text-red-600">{t("clear")}</AppText>
            </Pressable>
          </View>
          {recent.map((term) => (
            <Pressable key={term} onPress={() => submitSearch(term)} className="mb-2 rounded-xl bg-white p-3">
              <AppText>{term}</AppText>
            </Pressable>
          ))}
          <AppText className="mt-4 font-semibold">{t("trendingSearches")}</AppText>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {(trending || []).map((term) => (
              <Chip key={term} label={term} onPress={() => submitSearch(term)} />
            ))}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <NewsListSkeleton />
      ) : results?.length ? (
        <FlashList
          data={results}
          estimatedItemSize={120}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard article={item} variant="horizontal" />}
        />
      ) : (
        <EmptyState title={t("noResults")} />
      )}
    </View>
  );
}
