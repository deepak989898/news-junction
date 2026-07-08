import { View } from "react-native";
import { NewsComment } from "@/types/news";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { formatNewsDate } from "@/utils/article";
import { useI18n } from "@/hooks/useI18n";

export function CommentCard({
  comment,
  isOwn,
  liked,
  onLike,
  onReply,
  onReport,
  onDelete,
}: {
  comment: NewsComment;
  isOwn?: boolean;
  liked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
}) {
  const { language } = useI18n();
  return (
    <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <AppText className="font-semibold text-slate-900">{comment.userName}</AppText>
      <AppText className="mt-1 text-sm text-slate-700">{comment.text}</AppText>
      <AppText className="mt-2 text-xs text-slate-400">{formatNewsDate(comment.createdAt, language)}</AppText>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <AppButton title={liked ? `Liked (${comment.likes})` : `Like (${comment.likes})`} onPress={onLike} />
        <AppButton title="Reply" onPress={onReply} />
        {!isOwn ? <AppButton title="Report" onPress={onReport} /> : null}
        {isOwn ? <AppButton title="Delete" className="bg-red-600" onPress={onDelete} /> : null}
      </View>
    </View>
  );
}
