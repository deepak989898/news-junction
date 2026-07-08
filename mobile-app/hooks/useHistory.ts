import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addHistoryApi, getHistoryApi } from "@/services/api/personalization";
import { useAuth } from "@/hooks/useAuth";

export function useReadingHistory(limit = 40) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reading-history", user?.uid, limit],
    queryFn: async () => {
      const res = await getHistoryApi(limit, 0);
      return res.items;
    },
    enabled: Boolean(user),
  });
}

export function useHistoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addHistoryApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reading-history"] }),
  });
}
