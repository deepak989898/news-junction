import crypto from "crypto";

function signingKey(): Buffer {
  const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.CRON_SECRET || "";
  if (!key) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY not configured");
  return crypto.createHash("sha256").update(key).digest();
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function createOAuthState(payload: { uid: string; platform: string }): string {
  const data = {
    uid: payload.uid,
    platform: payload.platform,
    exp: Date.now() + 15 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): { uid: string; platform: string } {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid OAuth state signature");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    uid: string;
    platform: string;
    exp: number;
  };
  if (!parsed.uid || !parsed.platform) throw new Error("Invalid OAuth state payload");
  if (Date.now() > parsed.exp) throw new Error("OAuth session expired. Please try again.");
  return { uid: parsed.uid, platform: parsed.platform };
}
