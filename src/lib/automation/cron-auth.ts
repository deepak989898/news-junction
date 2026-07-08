import { NextRequest } from "next/server";

export function verifyCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret === secret) return true;

  // Vercel cron sends this header
  const vercelCron = request.headers.get("x-vercel-cron-signature");
  if (vercelCron && process.env.VERCEL === "1") return true;

  return false;
}
