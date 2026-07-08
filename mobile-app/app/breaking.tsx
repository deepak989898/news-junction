import { RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AppBar } from "@/components/ui/AppBar";
import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { BreakingCard } from "@/components/news/BreakingCard";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { useBreakingNews } from "@/hooks/useNewsFeed";
import { useI18n } from "@/hooks/useI18n";
import { formatNewsDate } from "@/utils/article";

export default function BreakingScreen() {
  const { t, language } = useI18n();
  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useBreakingNews(60000);

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title={t("breakingNews")} />
      <View className="flex-row items-center justify-between bg-red-600 px-4 py-2">
        <AppText className="text-xs font-bold uppercase text-white">Breaking</AppText>
        <AppText className="text-xs text-white">
          {t("lastUpdated")}: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </AppText>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {isLoading ? (
          <NewsListSkeleton />
        ) : (
          <>
            <View className="px-4 py-4">
              <AppButton title={t("readNow")} onPress={() => data?.[0] && router.push(`/article/${data[0].slug}`)} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-4">
              {(data || []).map((item) => (
                <BreakingCard key={item.id} article={item} />
              ))}
            </ScrollView>
            <AppText className="mb-2 px-4 text-lg font-bold">{t("latestUpdates")}</AppText>
            {(data || []).map((item) => (
              <View key={`timeline-${item.id}`} className="mx-4 mb-3 rounded-2xl bg-white p-4">
                <AppText className="text-xs text-red-600">{formatNewsDate(item.updatedAt || item.publishedAt, language)}</AppText>
                <NewsCard article={item} variant="compact" />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
