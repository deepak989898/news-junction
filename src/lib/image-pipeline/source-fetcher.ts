import { createHash } from "crypto";
import { ImagePipelineSettings } from "./types";

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^localhost$/i,
];

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  return PRIVATE_IP_PATTERNS.some((p) => p.test(host));
}

export function isAllowedImageUrl(url: string, settings: ImagePipelineSettings): boolean {
  if (!url || url === "/logo.png") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (isPrivateHost(parsed.hostname)) return false;

    const hostname = parsed.hostname.toLowerCase();
    const allowed = settings.allowedImageDomains.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );

    if (allowed) return true;

    // Allow source article domain when source images are enabled (validated at orchestrator)
    return settings.allowSourceImages;
  } catch {
    return false;
  }
}

export function isSourceArticleDomain(imageUrl: string, sourceLink: string): boolean {
  try {
    const imageHost = new URL(imageUrl).hostname.replace(/^www\./, "");
    const sourceHost = new URL(sourceLink).hostname.replace(/^www\./, "");
    return imageHost === sourceHost || imageHost.endsWith(`.${sourceHost}`);
  } catch {
    return false;
  }
}

export async function fetchPermittedImageBuffer(
  url: string,
  settings: ImagePipelineSettings,
  sourceLink?: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isAllowedImageUrl(url, settings)) return null;

  if (sourceLink && settings.allowSourceImages) {
    const fromSourceDomain = isSourceArticleDomain(url, sourceLink);
    const isKnownCdn = settings.allowedImageDomains.some((d) => url.includes(d));
    if (!fromSourceDomain && !isKnownCdn) return null;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NewsJunctionBot/1.0; +https://news-junction.vercel.app)",
        Accept: "image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8",
        Referer: sourceLink ? new URL(sourceLink).origin : undefined,
      },
    } as RequestInit);

    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (contentType && !allowedTypes.includes(contentType) && contentType !== "application/octet-stream") {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 2000) return null;
    if (arrayBuffer.byteLength > 10_000_000) return null;

    return { buffer: Buffer.from(arrayBuffer), contentType: contentType || "image/jpeg" };
  } catch {
    return null;
  }
}

export function hashImageBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
