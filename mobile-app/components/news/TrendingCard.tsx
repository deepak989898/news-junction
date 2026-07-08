import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { NewsArticle } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";
import { getArticleTitle, getRelativeTime } from "@/utils/article";

export function TrendingCard({ article, index }: { article: NewsArticle; index: number }) {
  const { language } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/article/${article.slug}`)}
      className="mx-4 mb-3 flex-row items-center rounded-2xl bg-white p-3 shadow-sm"
    >
      <AppText className="w-8 text-lg font-bold text-red-600">{index + 1}</AppText>
      <View className="flex-1 pr-2">
        <AppText numberOfLines={2} className="font-semibold text-slate-900">
          {getArticleTitle(article, language)}
        </AppText>
        <AppText className="mt-1 text-xs text-slate-500">{getRelativeTime(article.publishedAt, language)}</AppText>
      </View>
      {article.imageUrl ? (
        <Image source={{ uri: article.imageUrl }} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
      ) : null}
    </Pressable>
  );
}
