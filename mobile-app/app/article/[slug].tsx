import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Pressable, TextInput, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Audio } from "expo-av";
import RenderHTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { NewsCard } from "@/components/news/NewsCard";
import { ArticleGallery } from "@/components/news/ArticleGallery";
import { ShareSheet } from "@/components/news/ShareSheet";
import { CommentCard } from "@/components/news/CommentCard";
import { NewsListSkeleton } from "@/components/news/NewsSkeleton";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { useArticle, useRelatedNews } from "@/hooks/useArticle";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useBookmarkMutations, useBookmarks } from "@/hooks/useBookmarks";
import { useHistoryMutation } from "@/hooks/useHistory";
import { useComments, useCommentMutations } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useReaderSettings, getFontScale } from "@/providers/ReaderSettingsProvider";
import { useThemePreference } from "@/hooks/useThemePreference";
import {
  buildArticleShareUrl,
  extractGalleryImages,
  formatNewsDate,
  getArticleAudioUrl,
  getArticleContent,
  getArticleTitle,
  getCategoryName,
  getReadingTimeMinutes,
} from "@/utils/article";
import { env } from "@/config/env";
import { cacheArticle, enqueueDownload } from "@/services/offline/article-cache";
import { toggleArticleLike, getLikedArticles } from "@/services/storage/reader-storage";
import { copyArticleLink } from "@/services/share/share";

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: article, isLoading, refetch } = useArticle(slug || "");
  const { language, t } = useI18n();
  const { user } = useAuth();
  const { fontSize, lowImageMode } = useReaderSettings();
  const { resolvedTheme, setTheme } = useThemePreference();
  const { width } = useWindowDimensions();
  const [shareOpen, setShareOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyParent, setReplyParent] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const { data: related } = useRelatedNews(article?.categoryId || "", article?.id || "");
  const { data: recommendations } = useRecommendations();
  const { data: bookmarks } = useBookmarks();
  const { add, remove } = useBookmarkMutations();
  const historyMutation = useHistoryMutation();
  const { data: comments } = useComments(article?.id || "");
  const commentMutations = useCommentMutations(article?.id || "");

  const isBookmarked = useMemo(
    () => Boolean(bookmarks?.some((b) => b.articleId === article?.id)),
    [bookmarks, article?.id]
  );

  const shareUrl = article ? buildArticleShareUrl(article.slug, env.apiBaseUrl) : "";
  const gallery = article ? extractGalleryImages(article) : [];
  const html = article ? getArticleContent(article, language) : "";
  const baseFont = 16 * getFontScale(fontSize);

  useEffect(() => {
    if (!article || !user) return;
    historyMutation.mutate({
      articleId: article.id,
      categoryId: article.categoryId,
      categoryName: getCategoryName(article, language),
      readingTimeSec: getReadingTimeMinutes(article, language) * 60,
      completed: progress > 0.9,
      progress,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, user?.uid, progress > 0.9]);

  useEffect(() => {
    if (!user || !article) return;
    getLikedArticles(user.uid).then((ids) => setLiked(ids.includes(article.id)));
  }, [user, article?.id]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const toggleBookmark = async () => {
    if (!user || !article) return router.push("/auth/login");
    if (isBookmarked) await remove.mutateAsync(article.id);
    else
      await add.mutateAsync({
        articleId: article.id,
        title: getArticleTitle(article, language),
        slug: article.slug,
        categoryName: getCategoryName(article, language),
        language,
      });
  };

  const toggleLike = async () => {
    if (!user || !article) return router.push("/auth/login");
    const next = await toggleArticleLike(user.uid, article.id);
    setLiked(next);
  };

  const downloadOffline = async () => {
    if (!article) return;
    await cacheArticle(article);
    await enqueueDownload(article.slug);
  };

  const playAudio = async () => {
    if (!article) return;
    const url = getArticleAudioUrl(article, language);
    if (!url) return;
    if (playing) {
      await soundRef.current?.stopAsync();
      setPlaying(false);
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    soundRef.current = sound;
    setPlaying(true);
    await sound.playAsync();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const p = contentOffset.y / Math.max(1, contentSize.height - layoutMeasurement.height);
    setProgress(Math.min(1, Math.max(0, p)));
  };

  const postComment = async () => {
    if (!user || !article || !commentText.trim()) return router.push("/auth/login");
    await commentMutations.create.mutateAsync({
      articleId: article.id,
      uid: user.uid,
      userName: user.displayName || user.email || "Reader",
      userEmail: user.email || "",
      text: commentText.trim(),
      parentId: replyParent,
    });
    setCommentText("");
    setReplyParent(null);
  };

  if (isLoading || !article) {
    return (
      <View className="flex-1 bg-white pt-12">
        <NewsListSkeleton count={1} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <OfflineBanner onRetry={refetch} />
      <View className="absolute left-0 right-0 top-0 z-10 h-1 bg-slate-100">
        <View className="h-full bg-red-600" style={{ width: `${progress * 100}%` }} />
      </View>
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} className="pt-12">
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} />
          </Pressable>
          <View className="flex-row gap-4">
            <Pressable onPress={toggleBookmark}>
              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color="#dc2626" />
            </Pressable>
            <Pressable onPress={toggleLike}>
              <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color="#dc2626" />
            </Pressable>
            <Pressable onPress={() => setShareOpen(true)}>
              <Ionicons name="share-outline" size={22} />
            </Pressable>
          </View>
        </View>

        <View className="px-4">
          <AppText className="text-xs font-semibold uppercase text-red-600">{getCategoryName(article, language)}</AppText>
          <AppText className="mt-2 text-2xl font-bold text-slate-900">{getArticleTitle(article, language)}</AppText>
          <AppText className="mt-2 text-base text-slate-600">{article.author}</AppText>
          <AppText className="mt-1 text-sm text-slate-500">
            {formatNewsDate(article.publishedAt, language)} · {getReadingTimeMinutes(article, language)} min read
          </AppText>
          {article.updatedAt ? (
            <AppText className="text-xs text-slate-400">
              {t("updated")}: {formatNewsDate(article.updatedAt, language)}
            </AppText>
          ) : null}
        </View>

        {gallery.length > 1 ? (
          <View className="mt-4">
            <ArticleGallery images={gallery} />
          </View>
        ) : !lowImageMode && article.imageUrl ? (
          <View className="mt-4 px-4">
            <ArticleGallery images={[article.imageUrl]} />
          </View>
        ) : null}

        <View className="mt-4 px-4">
          <RenderHTML
            contentWidth={width - 32}
            source={{ html }}
            baseStyle={{
              fontSize: baseFont,
              lineHeight: baseFont * 1.6,
              color: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
            }}
          />
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2 px-4">
          {article.tags.map((tag) => (
            <View key={tag} className="rounded-full bg-slate-100 px-3 py-1">
              <AppText className="text-xs text-slate-600">#{tag}</AppText>
            </View>
          ))}
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2 px-4">
          <AppButton title={t("listen")} onPress={playAudio} />
          <AppButton title={t("offlineDownload")} onPress={downloadOffline} />
          <AppButton title={t("copyLink")} onPress={() => copyArticleLink(shareUrl)} />
          <AppButton title={t("printPlaceholder")} onPress={() => {}} />
          <AppButton
            title={resolvedTheme === "dark" ? t("lightMode") : t("darkMode")}
            onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          />
        </View>

        {article.sourceUrl ? (
          <Pressable className="mx-4 mt-4 rounded-xl bg-slate-50 p-3">
            <AppText className="text-sm text-red-600">{t("sourceLink")}: {article.sourceName}</AppText>
          </Pressable>
        ) : null}

        <View className="mt-8 px-4">
          <AppText className="text-lg font-bold">{t("comments")}</AppText>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t("writeComment")}
            className="mt-3 rounded-2xl border border-slate-200 px-4 py-3"
            multiline
          />
          <AppButton title={replyParent ? t("reply") : t("postComment")} className="mt-3" onPress={postComment} />
          {(comments || []).map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              isOwn={c.uid === user?.uid}
              liked={user ? c.likedBy.includes(user.uid) : false}
              onLike={() => {
                if (!user) return router.push("/auth/login");
                const hasLiked = c.likedBy.includes(user.uid);
                commentMutations.like.mutate({ commentId: c.id, uid: user.uid, liked: !hasLiked });
              }}
              onReply={() => setReplyParent(c.id)}
              onReport={() => commentMutations.report.mutate(c.id)}
              onDelete={() => commentMutations.remove.mutate(c.id)}
            />
          ))}
        </View>

        <View className="mt-6">
          <AppText className="mb-3 px-4 text-lg font-bold">{t("relatedNews")}</AppText>
          {(related || []).map((item) => (
            <NewsCard key={item.id} article={item} variant="horizontal" />
          ))}
        </View>

        <View className="mt-6 pb-10">
          <AppText className="mb-3 px-4 text-lg font-bold">{t("recommended")}</AppText>
          {recommendations?.slice(0, 4).map((rec) =>
            rec.article ? <NewsCard key={rec.articleId} article={rec.article} variant="compact" /> : null
          )}
        </View>
      </ScrollView>

      <ShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} title={getArticleTitle(article, language)} url={shareUrl} />
    </View>
  );
}
