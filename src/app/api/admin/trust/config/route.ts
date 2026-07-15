import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, verifySuperAdmin } from "@/lib/auth/verify-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { getTrustConfigServer } from "@/lib/trust/server";
import {
  DEFAULT_TRUST_CONFIG,
  TRUST_COLLECTION,
  TRUST_CONFIG_DOC_ID,
  getMissingTrustFields,
} from "@/lib/trust/defaults";
import type { TrustConfig } from "@/lib/trust/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getTrustConfigServer();
  return NextResponse.json({ config, missing: getMissingTrustFields(config) });
}

export async function PUT(request: NextRequest) {
  const admin = await verifySuperAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { error: "Only a super admin can edit ownership, contact and legal settings." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { config?: Partial<TrustConfig> };
  const input = body.config || {};

  // Whitelist known string fields only.
  const next: TrustConfig = { ...DEFAULT_TRUST_CONFIG };
  (Object.keys(DEFAULT_TRUST_CONFIG) as (keyof TrustConfig)[]).forEach((k) => {
    if (k === "updatedAt" || k === "updatedBy") return;
    const v = input[k];
    if (typeof v === "string") {
      (next[k] as string) = v.slice(0, 4000);
    }
  });
  next.updatedAt = new Date().toISOString();
  next.updatedBy = admin.email || admin.uid;

  await getAdminDb()
    .collection(TRUST_COLLECTION)
    .doc(TRUST_CONFIG_DOC_ID)
    .set(next, { merge: true });

  return NextResponse.json({ ok: true, config: next, missing: getMissingTrustFields(next) });
}
