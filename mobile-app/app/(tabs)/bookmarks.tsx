import { useMemo, useState } from "react";
import { View, TextInput, ScrollView } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { BookmarkCard } from "@/components/news/BookmarkCard";
import { EmptyState } from "@/components/states";
import { useBookmarks, useBookmarkMutations } from "@/hooks/useBookmarks";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Chip } from "@/components/ui/Chip";

export default function BookmarksScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string | undefined>();
  const { data: bookmarks, isLoading } = useBookmarks(query, folder);
  const { remove } = useBookmarkMutations();

  const folders = useMemo(() => {
    const set = new Set<string>();
    (bookmarks || []).forEach((b) => {
      if (b.folder) set.add(b.folder);
    });
    return Array.from(set);
  }, [bookmarks]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <AppText className="text-center text-slate-600">{t("loginRequired")}</AppText>
        <AppButton title={t("login")} className="mt-4" onPress={() => router.push("/auth/login")} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 pt-14">
      <View className="px-4">
        <AppText className="text-2xl font-bold">{t("bookmarks")}</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchBookmarks")}
          className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        />
      </View>
      {folders.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 px-4">
          <Chip label={t("all")} active={!folder} onPress={() => setFolder(undefined)} />
          {folders.map((f) => (
            <Chip key={f} label={f} active={folder === f} onPress={() => setFolder(f)} />
          ))}
        </ScrollView>
      ) : null}
      {isLoading ? (
        <AppText className="mt-6 text-center">{t("loading")}</AppText>
      ) : bookmarks?.length ? (
        <FlashList
          data={bookmarks}
          estimatedItemSize={90}
          keyExtractor={(item) => item.articleId}
          renderItem={({ item }) => (
            <BookmarkCard item={item} onRemove={() => remove.mutate(item.articleId)} />
          )}
        />
      ) : (
        <EmptyState title={t("noBookmarks")} subtitle={t("noBookmarksHint")} />
      )}
    </View>
  );
}
