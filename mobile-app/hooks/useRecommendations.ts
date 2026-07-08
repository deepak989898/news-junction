import { useQuery } from "@tanstack/react-query";
import { getRecommendationsApi } from "@/services/api/personalization";
import { getNewsByIds } from "@/services/news/firestore";
import { useAuth } from "@/hooks/useAuth";

export function useRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recommendations", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const res = await getRecommendationsApi();
      const ids = res.items.map((r) => r.articleId);
      const articles = await getNewsByIds(ids);
      return res.items
        .map((r) => ({
          ...r,
          article: articles.find((a) => a.id === r.articleId) || null,
        }))
        .filter((r) => r.article);
    },
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
  });
}
