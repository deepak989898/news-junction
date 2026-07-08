import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { NewsArticle } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/hooks/useI18n";
import { getArticleSummary, getArticleTitle, getCategoryName, getRelativeTime } from "@/utils/article";
import { useReaderSettings } from "@/providers/ReaderSettingsProvider";

type Props = {
  article: NewsArticle;
  variant?: "default" | "compact" | "horizontal";
  showImage?: boolean;
};

export function NewsCard({ article, variant = "default", showImage = true }: Props) {
  const { language } = useI18n();
  const { lowImageMode } = useReaderSettings();
  const title = getArticleTitle(article, language);
  const summary = getArticleSummary(article, language);
  const category = getCategoryName(article, language);
  const time = getRelativeTime(article.publishedAt, language);
  const shouldShowImage = showImage && !lowImageMode && article.imageUrl;

  const onPress = () => router.push(`/article/${article.slug}`);

  if (variant === "horizontal") {
    return (
      <Pressable onPress={onPress} className="mx-4 mb-3 flex-row overflow-hidden rounded-2xl bg-white shadow-sm">
        {shouldShowImage ? (
          <Image source={{ uri: article.imageUrl }} style={{ width: 110, height: 110 }} contentFit="cover" />
        ) : null}
        <View className="flex-1 p-3">
          <AppText numberOfLines={2} className="font-semibold text-slate-900">
            {title}
          </AppText>
          <AppText className="mt-1 text-xs text-slate-500">
            {category} · {time}
          </AppText>
        </View>
      </Pressable>
    );
  }

  if (variant === "compact") {
    return (
      <Pressable onPress={onPress} className="mx-4 mb-2 rounded-xl bg-white p-3 shadow-sm">
        <AppText numberOfLines={2} className="font-medium text-slate-900">
          {title}
        </AppText>
        <AppText className="mt-1 text-xs text-slate-500">{time}</AppText>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      {shouldShowImage ? (
        <Image source={{ uri: article.imageUrl }} style={{ width: "100%", height: 180 }} contentFit="cover" />
      ) : null}
      <View className="p-4">
        <View className="mb-2 flex-row items-center gap-2">
          {article.isBreaking ? <Badge text="Breaking" /> : null}
          <AppText className="text-xs text-red-600">{category}</AppText>
        </View>
        <AppText numberOfLines={3} className="text-base font-bold text-slate-900">
          {title}
        </AppText>
        <AppText numberOfLines={2} className="mt-2 text-sm text-slate-600">
          {summary}
        </AppText>
        <AppText className="mt-2 text-xs text-slate-400">{time}</AppText>
      </View>
    </Pressable>
  );
}
