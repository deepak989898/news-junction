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

function publicRelativePath(url: string): string | null {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed.replace(/^\//, "");
  }
  try {
    const parsed = new URL(resolvePublicUrl(trimmed));
    const origin = getSiteOrigin();
    if (parsed.origin === origin || parsed.hostname.includes("news-junction") || parsed.hostname.includes("newsjunction")) {
      return parsed.pathname.replace(/^\//, "");
    }
  } catch {
    // Not a usable URL.
  }
  return null;
}

async function readPublicFile(relativePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(process.cwd(), "public", relativePath));
  } catch {
    return null;
  }
}

/** Load bytes from an http(s) URL or a path served from /public. */
export async function loadAssetBuffer(url: string): Promise<Buffer> {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("Asset URL is empty");

  const relative = publicRelativePath(trimmed);
  if (relative) {
    const local = await readPublicFile(relative);
    if (local) return local;
  }

  const resolved = resolvePublicUrl(trimmed);
  if (!/^https?:\/\//i.test(resolved)) {
    throw new Error(`Invalid asset URL: ${trimmed}`);
  }

  const res = await fetch(resolved, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Failed to fetch ${resolved}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Load asset with soft fallbacks (missing category images → logo). */
export async function loadAssetBufferWithFallbacks(url: string, fallbacks: string[] = ["/logo.png"]): Promise<Buffer> {
  const candidates = [url, ...fallbacks].filter(Boolean);
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return await loadAssetBuffer(candidate);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(errors[0] || "Failed to load media asset");
}
