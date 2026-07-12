import { NextRequest } from "next/server";

function normalizeSecret(value: string | null | undefined): string {
  return (value || "").trim();
}

function secretsMatch(provided: string, expected: string): boolean {
  return normalizeSecret(provided) === normalizeSecret(expected);
}

function checkAuthorizationHeader(authHeader: string | null, secret: string): boolean {
  const header = normalizeSecret(authHeader);
  if (!header) return false;
  if (secretsMatch(header, secret)) return true;
  if (secretsMatch(header, `Bearer ${secret}`)) return true;
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch && secretsMatch(bearerMatch[1], secret)) return true;
  return false;
}

export function isCronSecretConfigured(): boolean {
  return Boolean(normalizeSecret(process.env.CRON_SECRET));
}

export function verifyCronRequest(request: NextRequest): boolean {
  const secret = normalizeSecret(process.env.CRON_SECRET);
  if (!secret) return false;

  if (checkAuthorizationHeader(request.headers.get("authorization"), secret)) return true;

  const cronSecretHeader = request.headers.get("x-cron-secret") || "";
  if (cronSecretHeader && secretsMatch(cronSecretHeader, secret)) return true;

  const querySecret =
    request.nextUrl.searchParams.get("cron_secret") ||
    request.nextUrl.searchParams.get("secret") ||
    "";
  if (querySecret && secretsMatch(querySecret, secret)) return true;

  // Vercel cron sends this header
  const vercelCron = request.headers.get("x-vercel-cron-signature");
  if (vercelCron && process.env.VERCEL === "1") return true;

  return false;
}

export function getCronAuthFailureHint(): string {
  if (!isCronSecretConfigured()) {
    return "CRON_SECRET is not set on Vercel. Add it in Environment Variables and redeploy.";
  }
  return [
    "Invalid cron authentication.",
    "Use header: Authorization = Bearer YOUR_CRON_SECRET",
    "Or header: x-cron-secret = YOUR_CRON_SECRET",
    "Or URL query: ?cron_secret=YOUR_CRON_SECRET",
  ].join(" ");
}
