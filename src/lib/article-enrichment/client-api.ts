import { getAuthToken } from "@/lib/automation/client-api";

async function callEnrichApi<T>(path: string, body: unknown): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Enrichment API failed");
  return data as T;
}

export const enrichArticleOnPublishApi = (
  articleId: string,
  options?: {
    sendPush?: boolean;
    queueSocial?: boolean;
    forceFaq?: boolean;
    forceLinks?: boolean;
    forceMeta?: boolean;
  }
) => callEnrichApi("/api/admin/articles/on-publish", { articleId, ...options });

export const backfillArticleEnrichmentApi = (limit = 30) =>
  callEnrichApi("/api/admin/articles/backfill-enrichment", { limit });

export const sendPushNotificationApi = (payload: {
  title: string;
  body: string;
  articleId?: string;
  slug?: string;
  type?: string;
}) => callEnrichApi("/api/notifications/send", payload);

export const applyGrowthRecommendationApi = (payload: {
  recommendationId?: string;
  recommendationType: string;
  articleId?: string;
  title?: string;
}) => callEnrichApi("/api/ai/apply-recommendation", payload);
