import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Category } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/hooks/useI18n";

export function CategoryCard({ category }: { category: Category }) {
  const { language } = useI18n();
  const name = language === "hi" ? category.nameHi : category.nameEn;
  return (
    <Pressable
      onPress={() => router.push(`/category/${category.slug}`)}
      className="mr-3 w-36 rounded-2xl bg-white p-4 shadow-sm"
    >
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-red-50">
        <AppText className="font-bold text-red-600">{name.charAt(0)}</AppText>
      </View>
      <AppText numberOfLines={2} className="font-semibold text-slate-900">
        {name}
      </AppText>
    </Pressable>
  );
}
