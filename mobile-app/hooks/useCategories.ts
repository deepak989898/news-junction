import { useQuery } from "@tanstack/react-query";
import { getCategories, getCategoryBySlug } from "@/services/news/firestore";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
    enabled: Boolean(slug),
  });
}
