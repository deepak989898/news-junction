import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addBookmarkApi, getBookmarksApi, removeBookmarkApi } from "@/services/api/personalization";
import { useAuth } from "@/hooks/useAuth";

export function useBookmarks(query?: string, category?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bookmarks", user?.uid, query, category],
    queryFn: async () => {
      const res = await getBookmarksApi(query, category);
      return res.items;
    },
    enabled: Boolean(user),
  });
}

export function useBookmarkMutations() {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: addBookmarkApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
  const remove = useMutation({
    mutationFn: (articleId: string) => removeBookmarkApi(articleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
  return { add, remove };
}
