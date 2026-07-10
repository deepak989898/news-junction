import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const DEFAULT_RUNTIME_CONFIG = {
  maintenanceEnabled: false,
  maintenanceMessage: "",
  minimumVersion: "1.0.0",
  latestVersion: "1.0.0",
  forceUpdate: false,
  optionalUpdate: false,
  releaseNotes: "",
  featureRolloutPercent: 100,
  emergencyDisable: false,
  featureFlags: {
    aiCenter: true,
    adminCenter: true,
    diagnostics: true,
    performanceMetrics: true,
    crashReporting: true,
  } as Record<string, boolean>,
};

export async function GET(_request: NextRequest) {
  try {
    const doc = await getAdminDb().collection("settings").doc("appRuntimeConfig").get();
    if (!doc.exists) return NextResponse.json(DEFAULT_RUNTIME_CONFIG);
    const data = (doc.data() || {}) as Record<string, unknown>;
    return NextResponse.json({
      ...DEFAULT_RUNTIME_CONFIG,
      ...data,
      featureFlags: {
        ...DEFAULT_RUNTIME_CONFIG.featureFlags,
        ...((data.featureFlags as Record<string, boolean> | undefined) || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runtime config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
