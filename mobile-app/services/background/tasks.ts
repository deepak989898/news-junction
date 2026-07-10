import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { processDownloadQueue } from "@/services/offline/article-cache";
import { getNewsBySlug } from "@/services/news/firestore";
import { listRetryActions } from "@/services/reliability/network-monitor";
import { apiFetch } from "@/services/api/client";

export const TASK_NAME = "nj_background_sync_task";

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await processDownloadQueue((slug) => getNewsBySlug(slug));
    const retries = await listRetryActions();
    for (const action of retries.slice(0, 20)) {
      try {
        await apiFetch(action.endpoint, { method: action.method, body: action.body });
      } catch {
        // keep queued
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Denied ||
    status === BackgroundFetch.BackgroundFetchStatus.Restricted
  ) {
    return false;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
  return true;
}
