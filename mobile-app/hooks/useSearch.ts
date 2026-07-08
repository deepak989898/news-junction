import { useQuery } from "@tanstack/react-query";
import { searchNews, getTrendingNews } from "@/services/news/firestore";
import { getTrendingSearchTerms } from "@/services/news/firestore";

export function useSearchNews(term: string, categoryId?: string) {
  return useQuery({
    queryKey: ["search", term, categoryId],
    queryFn: () => searchNews(term, 40, categoryId),
    enabled: term.trim().length >= 2,
  });
}

export function useTrendingSearches() {
  return useQuery({
    queryKey: ["trending-searches"],
    queryFn: async () => {
      const trending = await getTrendingNews(20);
      return getTrendingSearchTerms(trending);
    },
    staleTime: 1000 * 60 * 15,
  });
}
