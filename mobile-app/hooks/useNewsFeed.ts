import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getBreakingNews,
  getFeaturedNews,
  getLatestNews,
  getLatestNewsPage,
  getPopularNews,
  getRecentlyUpdatedNews,
  getTrendingNews,
} from "@/services/news/firestore";
import { useNetwork } from "@/providers/NetworkProvider";

export function useHomeFeed() {
  const { online } = useNetwork();
  return useQuery({
    queryKey: ["home-feed", online],
    queryFn: async () => {
      const [featured, breaking, trending, latest, popular, updated] = await Promise.all([
        getFeaturedNews(5),
        getBreakingNews(8),
        getTrendingNews(8),
        getLatestNews(10),
        getPopularNews(6),
        getRecentlyUpdatedNews(6),
      ]);
      return { featured, breaking, trending, latest, popular, updated };
    },
    staleTime: 1000 * 60,
  });
}

export function useInfiniteLatestNews(pageSize = 12) {
  return useInfiniteQuery({
    queryKey: ["latest-news-infinite", pageSize],
    initialPageParam: null as import("firebase/firestore").QueryDocumentSnapshot | null,
    queryFn: ({ pageParam }) => getLatestNewsPage(pageSize, pageParam || undefined),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
  });
}

export function useBreakingNews(refetchInterval?: number) {
  return useQuery({
    queryKey: ["breaking-news"],
    queryFn: () => getBreakingNews(20),
    refetchInterval,
    staleTime: 1000 * 30,
  });
}
