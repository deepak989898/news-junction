import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteOwnComment,
  getArticleComments,
  likeComment,
  postComment,
  reportComment,
} from "@/services/comments/firestore";

export function useComments(articleId: string) {
  return useQuery({
    queryKey: ["comments", articleId],
    queryFn: () => getArticleComments(articleId),
    enabled: Boolean(articleId),
  });
}

export function useCommentMutations(articleId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["comments", articleId] });

  const create = useMutation({
    mutationFn: postComment,
    onSuccess: invalidate,
  });
  const like = useMutation({
    mutationFn: ({ commentId, uid, liked }: { commentId: string; uid: string; liked: boolean }) =>
      likeComment(commentId, uid, liked),
    onSuccess: invalidate,
  });
  const report = useMutation({
    mutationFn: reportComment,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteOwnComment,
    onSuccess: invalidate,
  });
  return { create, like, report, remove };
}
