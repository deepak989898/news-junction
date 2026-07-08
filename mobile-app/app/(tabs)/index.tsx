import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { HomeAppBar } from "@/components/layout/HomeAppBar";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { BreakingTicker, BreakingCard } from "@/components/news/BreakingCard";
import { HeroCarousel } from "@/components/news/HeroCarousel";
import { NewsCard } from "@/components/news/NewsCard";
import { TrendingCard } from "@/components/news/TrendingCard";
import { CategoryCard } from "@/components/news/CategoryCard";
import { HeroSkeleton, NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { ErrorState } from "@/components/states";
import { useHomeFeed, useInfiniteLatestNews } from "@/hooks/useNewsFeed";
import { useCategories } from "@/hooks/useCategories";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useI18n } from "@/hooks/useI18n";
import { NewsArticle } from "@/types/news";

export default function HomeScreen() {
  const { t } = useI18n();
  const { data, isLoading, isError, refetch, isRefetching } = useHomeFeed();
  const { data: categories } = useCategories();
  const { data: recommendations } = useRecommendations();
  const infinite = useInfiniteLatestNews(12);

  const latestPages = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.items) || [],
    [infinite.data]
  );

  const onRefresh = useCallback(() => {
    refetch();
    infinite.refetch();
  }, [refetch, infinite]);

  const header = (
    <View>
      {isLoading ? (
        <>
          <HeroSkeleton />
          <NewsListSkeleton count={2} />
        </>
      ) : (
        <>
          <SectionHeader title={t("topStories")} />
          <HeroCarousel items={data?.featured || []} />

          <SectionHeader title={t("breakingNews")} actionLabel={t("viewAll")} href="/breaking" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
            {(data?.breaking || []).map((item) => (
              <BreakingCard key={item.id} article={item} />
            ))}
          </ScrollView>

          <SectionHeader title={t("trendingNews")} />
          {(data?.trending || []).slice(0, 5).map((item, index) => (
            <TrendingCard key={item.id} article={item} index={index} />
          ))}

          <SectionHeader title={t("latestNews")} />
          {(data?.latest || []).slice(0, 4).map((item) => (
            <NewsCard key={item.id} article={item} variant="horizontal" />
          ))}

          <SectionHeader title={t("categories")} actionLabel={t("viewAll")} href="/(tabs)/categories" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
            {(categories || []).map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </ScrollView>

          <SectionHeader title={t("editorsPicks")} />
          {(data?.featured || []).slice(0, 3).map((item) => (
            <NewsCard key={`pick-${item.id}`} article={item} />
          ))}

          {recommendations?.length ? (
            <>
              <SectionHeader title={t("recommended")} />
              {recommendations.slice(0, 4).map((rec) =>
                rec.article ? (
                  <NewsCard key={rec.articleId} article={rec.article as NewsArticle} variant="compact" />
                ) : null
              )}
            </>
          ) : null}

          <SectionHeader title={t("popularStories")} />
          {(data?.popular || []).slice(0, 4).map((item) => (
            <NewsCard key={`pop-${item.id}`} article={item} variant="horizontal" />
          ))}

          <SectionHeader title={t("recentlyUpdated")} />
          {(data?.updated || []).slice(0, 4).map((item) => (
            <NewsCard key={`upd-${item.id}`} article={item} variant="compact" />
          ))}

          <SectionHeader title={t("loadMore")} />
        </>
      )}
    </View>
  );

  if (isError) return <ErrorState message="Failed to load news feed" onRetry={onRefresh} />;

  return (
    <View className="flex-1 bg-slate-50">
      <HomeAppBar />
      <OfflineBanner onRetry={onRefresh} />
      {data?.breaking?.length ? <BreakingTicker items={data.breaking} /> : null}
      <FlashList
        data={isLoading ? [] : latestPages}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewsCard article={item} variant="horizontal" />}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (infinite.hasNextPage && !infinite.isFetchingNextPage) infinite.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={infinite.isFetchingNextPage ? <NewsListSkeleton count={2} /> : null}
      />
    </View>
  );
}
