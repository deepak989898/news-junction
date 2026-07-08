import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { Chip } from "@/components/ui/Chip";
import { NewsCard } from "@/components/news/NewsCard";
import { TrendingCard } from "@/components/news/TrendingCard";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { useCategory } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { getNewsByCategory } from "@/services/news/firestore";
import { useQuery } from "@tanstack/react-query";
import { NewsDateFilter, NewsSort } from "@/types/news";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language, t } = useI18n();
  const { data: category } = useCategory(slug || "");
  const [sort, setSort] = useState<NewsSort>("latest");
  const [dateFilter, setDateFilter] = useState<NewsDateFilter>("all");

  const { data: articles, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["category-news", slug, sort, dateFilter],
    queryFn: () => getNewsByCategory(slug || "", 40, sort, dateFilter),
    enabled: Boolean(slug),
  });

  const name = category ? (language === "hi" ? category.nameHi : category.nameEn) : slug;

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={name || t("categories")} />
      <View className="bg-red-600 px-4 py-6">
        <SectionHeader title={name || ""} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
        {(["latest", "popular", "trending"] as NewsSort[]).map((s) => (
          <Chip key={s} label={s} active={sort === s} onPress={() => setSort(s)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
        {(["all", "today", "week", "month"] as NewsDateFilter[]).map((d) => (
          <Chip key={d} label={d} active={dateFilter === d} onPress={() => setDateFilter(d)} />
        ))}
      </ScrollView>
      {isLoading ? (
        <NewsListSkeleton />
      ) : (
        <FlashList
          data={articles || []}
          estimatedItemSize={130}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            sort === "trending" ? (
              <TrendingCard article={item} index={index} />
            ) : (
              <NewsCard article={item} variant="horizontal" />
            )
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={<SectionHeader title={t("latestNews")} />}
        />
      )}
    </View>
  );
}
