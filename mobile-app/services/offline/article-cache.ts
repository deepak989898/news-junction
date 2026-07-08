import AsyncStorage from "@react-native-async-storage/async-storage";
import { NewsArticle } from "@/types/news";

const CACHE_PREFIX = "nj_offline_article_";
const QUEUE_KEY = "nj_offline_download_queue";

export async function cacheArticle(article: NewsArticle) {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${article.slug}`, JSON.stringify(article));
}

export async function getCachedArticle(slug: string) {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${slug}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NewsArticle;
  } catch {
    return null;
  }
}

export async function removeCachedArticle(slug: string) {
  await AsyncStorage.removeItem(`${CACHE_PREFIX}${slug}`);
}

export async function listCachedArticleSlugs() {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => k.replace(CACHE_PREFIX, ""));
}

export async function enqueueDownload(slug: string) {
  const queue = await getDownloadQueue();
  if (!queue.includes(slug)) {
    queue.push(slug);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function dequeueDownload(slug: string) {
  const queue = (await getDownloadQueue()).filter((s) => s !== slug);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getDownloadQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [] as string[];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function processDownloadQueue(fetcher: (slug: string) => Promise<NewsArticle | null>) {
  const queue = await getDownloadQueue();
  for (const slug of queue) {
    const article = await fetcher(slug);
    if (article) {
      await cacheArticle(article);
      await dequeueDownload(slug);
    }
  }
}
