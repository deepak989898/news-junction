import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminArticlesApi,
  getAdminDashboardApi,
  getAdminUsersApi,
  getGlobalAdminSearchApi,
  getMyAdminProfileApi,
  getOperationsSnapshotApi,
  getOrchestratorSnapshotApi,
  getAnalyticsSnapshotApi,
  runAdminAiActionApi,
  runOrchestratorActionApi,
  updateAdminArticleStatusApi,
  updateAdminUserApi,
} from "@/services/api/admin";
import { useAuth } from "@/hooks/useAuth";

export function useAdminProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-profile", user?.uid],
    queryFn: async () => (await getMyAdminProfileApi()).profile,
    enabled: Boolean(user),
  });
}

export function useAdminDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-dashboard", user?.uid],
    queryFn: getAdminDashboardApi,
    enabled: Boolean(user),
    refetchInterval: 60000,
  });
}

export function useAdminArticles(status?: string, query?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-articles", user?.uid, status, query],
    queryFn: async () => (await getAdminArticlesApi({ status, query, limit: 100 })).items,
    enabled: Boolean(user),
  });
}

export function useAdminActions() {
  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: updateAdminArticleStatusApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
  const runAi = useMutation({
    mutationFn: runAdminAiActionApi,
  });
  return { updateStatus, runAi };
}

export function useOperationsSnapshot() {
  return useQuery({
    queryKey: ["admin-operations-snapshot"],
    queryFn: getOperationsSnapshotApi,
    refetchInterval: 45000,
  });
}

export function useOrchestratorSnapshot() {
  return useQuery({
    queryKey: ["admin-orchestrator-snapshot"],
    queryFn: getOrchestratorSnapshotApi,
    refetchInterval: 45000,
  });
}

export function useOrchestratorActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runOrchestratorActionApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orchestrator-snapshot"] }),
  });
}

export function useAnalyticsSnapshot() {
  return useQuery({
    queryKey: ["admin-analytics-snapshot"],
    queryFn: getAnalyticsSnapshotApi,
    refetchInterval: 60000,
  });
}

export function useGlobalAdminSearch(query: string) {
  return useQuery({
    queryKey: ["admin-global-search", query],
    queryFn: async () => (await getGlobalAdminSearchApi(query)).results,
    enabled: query.trim().length > 1,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await getAdminUsersApi()).items,
  });
}

export function useAdminUserActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAdminUserApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}
