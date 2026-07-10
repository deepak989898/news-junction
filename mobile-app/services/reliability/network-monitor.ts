import * as Network from "expo-network";
import { getStorageItem, setStorageItem } from "@/services/storage/app-storage";

export type NetworkQuality = "offline" | "poor" | "slow" | "good";

const RETRY_KEY = "nj_retry_queue";

export async function getNetworkQuality(): Promise<NetworkQuality> {
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected || state.isInternetReachable === false) return "offline";
  const type = String(state.type || "").toLowerCase();
  if (type.includes("none")) return "offline";
  if (type.includes("cellular")) return "slow";
  return "good";
}

type RetryAction = {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  body: Record<string, unknown>;
  createdAt: string;
};

export async function enqueueRetryAction(action: Omit<RetryAction, "id" | "createdAt">) {
  const raw = (await getStorageItem(RETRY_KEY)) || "[]";
  const items = JSON.parse(raw) as RetryAction[];
  const next: RetryAction[] = [
    {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    },
    ...items,
  ].slice(0, 200);
  await setStorageItem(RETRY_KEY, JSON.stringify(next));
}

export async function listRetryActions() {
  const raw = (await getStorageItem(RETRY_KEY)) || "[]";
  return JSON.parse(raw) as RetryAction[];
}

export async function clearRetryActions() {
  await setStorageItem(RETRY_KEY, "[]");
}
