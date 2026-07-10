import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";
import { OfflineAdminAction } from "@/types/admin";

const KEY = "nj_admin_offline_queue";

async function readQueue(): Promise<OfflineAdminAction[]> {
  const raw = await getStorageItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineAdminAction[];
  } catch {
    return [];
  }
}

export async function listOfflineAdminActions() {
  return readQueue();
}

export async function enqueueOfflineAdminAction(action: Omit<OfflineAdminAction, "id" | "createdAt">) {
  const queue = await readQueue();
  const item: OfflineAdminAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await setStorageItem(KEY, JSON.stringify([item, ...queue]));
  return item;
}

export async function removeOfflineAdminAction(id: string) {
  const queue = await readQueue();
  await setStorageItem(KEY, JSON.stringify(queue.filter((a) => a.id !== id)));
}
