import { Dimensions, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { NewsArticle } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";
import { getArticleTitle, getCategoryName } from "@/utils/article";

const width = Dimensions.get("window").width;

export function HeroCarousel({ items }: { items: NewsArticle[] }) {
  const { language } = useI18n();
  if (!items.length) return null;

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="mt-3">
      {items.map((article) => (
        <Pressable
          key={article.id}
          onPress={() => router.push(`/article/${article.slug}`)}
          style={{ width }}
          className="px-4"
        >
          <View className="overflow-hidden rounded-3xl bg-slate-900">
            {article.imageUrl ? (
              <Image source={{ uri: article.imageUrl }} style={{ width: "100%", height: 220 }} contentFit="cover" />
            ) : (
              <View style={{ height: 220 }} className="bg-slate-800" />
            )}
            <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
              <AppText className="text-xs font-semibold uppercase text-red-300">
                {getCategoryName(article, language)}
              </AppText>
              <AppText numberOfLines={3} className="mt-1 text-lg font-bold text-white">
                {getArticleTitle(article, language)}
              </AppText>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
