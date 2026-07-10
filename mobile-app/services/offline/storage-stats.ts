import * as FileSystem from "expo-file-system";
import { listCachedArticleSlugs } from "./article-cache";

export async function getOfflineStorageUsage() {
  const cacheDir = FileSystem.cacheDirectory || "";
  const docDir = FileSystem.documentDirectory || "";
  const [cacheInfo, docInfo, cachedSlugs] = await Promise.all([
    cacheDir ? FileSystem.getInfoAsync(cacheDir) : Promise.resolve({ exists: false, size: 0 }),
    docDir ? FileSystem.getInfoAsync(docDir) : Promise.resolve({ exists: false, size: 0 }),
    listCachedArticleSlugs(),
  ]);
  return {
    cacheBytes: Number((cacheInfo as { size?: number }).size || 0),
    documentBytes: Number((docInfo as { size?: number }).size || 0),
    downloadedArticles: cachedSlugs.length,
    downloadedImages: 0,
  };
}

export async function clearOfflineStorage() {
  const cacheDir = FileSystem.cacheDirectory || "";
  if (cacheDir) {
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  }
}
