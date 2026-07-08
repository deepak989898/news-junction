import { useQuery } from "@tanstack/react-query";
import { getNewsBySlug, getRelatedNews } from "@/services/news/firestore";
import { getCachedArticle } from "@/services/offline/article-cache";

export function useArticle(slug: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const onlineArticle = await getNewsBySlug(slug);
      if (onlineArticle) return onlineArticle;
      return getCachedArticle(slug);
    },
    enabled: Boolean(slug),
  });
}

export function useRelatedNews(categoryId: string, excludeId: string) {
  return useQuery({
    queryKey: ["related-news", categoryId, excludeId],
    queryFn: () => getRelatedNews(categoryId, excludeId, 6),
    enabled: Boolean(categoryId && excludeId),
  });
}
