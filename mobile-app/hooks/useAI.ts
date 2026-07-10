import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  askAssistantApi,
  deleteAiChatApi,
  getAiCenterApi,
  getAiChatsApi,
  pinAiChatApi,
  runAiActionApi,
  searchAiApi,
} from "@/services/api/ai";
import { AiActionMode } from "@/types/ai";
import { useAuth } from "@/hooks/useAuth";

export function useAiCenter() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-center", user?.uid],
    queryFn: getAiCenterApi,
    enabled: Boolean(user),
    staleTime: 1000 * 60,
  });
}

export function useAssistant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: askAssistantApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-chats"] });
      qc.invalidateQueries({ queryKey: ["ai-center"] });
    },
  });
}

export function useAiAction() {
  return useMutation({
    mutationFn: (payload: { mode: AiActionMode; text: string; language?: "hi" | "en" }) => runAiActionApi(payload),
  });
}

export function useAiSearch() {
  return useMutation({
    mutationFn: (query: string) => searchAiApi(query),
  });
}

export function useAiChats(query?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-chats", user?.uid, query],
    queryFn: () => getAiChatsApi(query).then((r) => r.items),
    enabled: Boolean(user),
  });
}

export function useAiChatMutations() {
  const qc = useQueryClient();
  const pin = useMutation({
    mutationFn: ({ chatId, pinned }: { chatId: string; pinned: boolean }) => pinAiChatApi(chatId, pinned),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-chats"] }),
  });
  const remove = useMutation({
    mutationFn: deleteAiChatApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-chats"] }),
  });
  return { pin, remove };
}
