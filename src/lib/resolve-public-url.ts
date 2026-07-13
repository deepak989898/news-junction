import "server-only";

import fs from "fs/promises";
import path from "path";

export function getSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app").replace(/\/$/, "");
}

export function resolvePublicUrl(url: string): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const origin = getSiteOrigin();
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Load bytes from an http(s) URL or a path served from /public. */
export async function loadAssetBuffer(url: string): Promise<Buffer> {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("Asset URL is empty");

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const localPath = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""));
    try {
      return await fs.readFile(localPath);
    } catch {
      // Fall through to absolute HTTP fetch.
    }
  }

  const resolved = resolvePublicUrl(trimmed);
  if (!/^https?:\/\//i.test(resolved)) {
    throw new Error(`Invalid asset URL: ${trimmed}`);
  }

  const res = await fetch(resolved, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Failed to fetch ${resolved}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
