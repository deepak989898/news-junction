import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { NewsArticle } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";
import { getArticleTitle, getRelativeTime } from "@/utils/article";

export function BreakingCard({ article }: { article: NewsArticle }) {
  const { language } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/article/${article.slug}`)}
      className="mr-3 w-72 rounded-2xl border border-red-100 bg-red-50 p-4"
    >
      <AppText className="text-xs font-bold uppercase text-red-600">Breaking</AppText>
      <AppText numberOfLines={3} className="mt-2 text-base font-bold text-slate-900">
        {getArticleTitle(article, language)}
      </AppText>
      <AppText className="mt-2 text-xs text-slate-500">{getRelativeTime(article.publishedAt, language)}</AppText>
    </Pressable>
  );
}

export function BreakingTicker({ items }: { items: NewsArticle[] }) {
  if (!items.length) return null;
  return (
    <Pressable onPress={() => router.push("/breaking")} className="bg-red-600 px-4 py-2">
      <View className="flex-row items-center gap-2">
        <AppText className="text-xs font-bold uppercase text-white">Live</AppText>
        <AppText numberOfLines={1} className="flex-1 text-sm text-white">
          {items[0] ? getArticleTitle(items[0], "en") : ""}
        </AppText>
      </View>
    </Pressable>
  );
}
