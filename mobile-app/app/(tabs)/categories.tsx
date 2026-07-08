import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { AppText } from "@/components/ui/AppText";
import { CategoryCard } from "@/components/news/CategoryCard";
import { useCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";

export default function CategoriesTabScreen() {
  const { t } = useI18n();
  const { data: categories, isLoading } = useCategories();

  if (isLoading) return <NewsListSkeleton />;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-4 pt-14 pb-2">
        <AppText className="text-2xl font-bold">{t("categories")}</AppText>
      </View>
      <FlashList
        data={categories || []}
        numColumns={2}
        estimatedItemSize={140}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-1 p-2">
            <CategoryCard category={item} />
          </View>
        )}
        contentContainerStyle={{ padding: 8 }}
      />
    </View>
  );
}
