import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { useQuery } from "@tanstack/react-query";
import { getLiveNewsUpdates } from "@/services/news/firestore";
import { useI18n } from "@/hooks/useI18n";
import { formatNewsDate } from "@/utils/article";
import { getArticleTitle } from "@/utils/article";

export default function LiveNewsScreen() {
  const { t, language } = useI18n();
  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ["live-news"],
    queryFn: () => getLiveNewsUpdates(25),
    refetchInterval: 30000,
  });

  const pinned = data?.[0];

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("liveNews")} />
      <View className="flex-row items-center justify-between bg-red-700 px-4 py-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-white" />
          <AppText className="text-xs font-bold uppercase text-white">Live</AppText>
        </View>
        <AppText className="text-xs text-white">
          {t("lastUpdated")}: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </AppText>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {isLoading ? (
          <NewsListSkeleton />
        ) : (
          <>
            {pinned ? (
              <View className="m-4 rounded-2xl border-2 border-red-600 bg-white p-4">
                <AppText className="text-xs font-bold uppercase text-red-600">{t("pinnedLiveStory")}</AppText>
                <AppText className="mt-2 text-lg font-bold">{getArticleTitle(pinned, language)}</AppText>
                <AppText className="mt-4 text-sm text-red-600" onPress={() => router.push(`/article/${pinned.slug}`)}>
                  {t("readNow")}
                </AppText>
              </View>
            ) : null}
            <AppText className="mb-2 px-4 text-lg font-bold">{t("liveTimeline")}</AppText>
            {(data || []).map((item) => (
              <View key={item.id} className="mx-4 mb-3 border-l-4 border-red-600 bg-white p-4">
                <AppText className="text-xs text-slate-500">{formatNewsDate(item.updatedAt || item.publishedAt, language)}</AppText>
                <NewsCard article={item} variant="compact" />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
