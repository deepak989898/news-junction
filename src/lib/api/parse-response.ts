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
      if (
        res.status === 504 ||
        res.status === 524 ||
        /FUNCTION_INVOCATION_TIMEOUT|FUNCTION_INVOCATION_TOO_LARGE|timed out|Timeout/i.test(text)
      ) {
        throw new Error(
          "Server timed out while generating the AI image (Vercel FUNCTION_INVOCATION_TIMEOUT). Wait a moment and click Regenerate AI Image again."
        );
      }
      throw new Error(
        res.status === 404
          ? "API route not found. Redeploy the latest code on Vercel."
          : `Server returned HTML instead of JSON (${res.status}). Check Vercel logs and FIREBASE_SERVICE_ACCOUNT_KEY.`
      );
    }
    if (/FUNCTION_INVOCATION_TIMEOUT/i.test(text)) {
      throw new Error(
        "Server timed out while generating the AI image. Please try Regenerate AI Image again."
      );
    }
    throw new Error(text.slice(0, 180) || `Invalid response (${res.status})`);
  }
}
