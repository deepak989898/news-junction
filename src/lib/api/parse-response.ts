export async function parseApiResponse<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(`Empty response (${res.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      throw new Error(
        res.status === 404
          ? "API route not found. Redeploy the latest code on Vercel."
          : `Server returned HTML instead of JSON (${res.status}). Check Vercel logs and FIREBASE_SERVICE_ACCOUNT_KEY.`
      );
    }
    throw new Error(text.slice(0, 180) || `Invalid response (${res.status})`);
  }
}
