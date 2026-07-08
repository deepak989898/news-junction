export async function retryWithBackoff<T>(task: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await task();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, (attempt + 1) * 500));
      attempt += 1;
    }
  }
  throw lastError;
}

export async function futureSyncPlaceholder() {
  return { ok: true, message: "Sync pipeline reserved for future phases." };
}
