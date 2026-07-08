import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getLogs, getOperationsSettings, updateOperationsSettings } from "@/lib/operations/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 200);
    const logs = await getLogs(limit);
    return NextResponse.json(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }
  try {
    const {
      maintenanceMode,
      maintenanceMessage,
      adminWhitelist,
      healthCheckInterval,
      maxRetryAttempts,
      queueWarningThreshold,
      errorAlertThreshold,
      costAlertThreshold,
      allowManualCronRun,
      automationToggles,
      confirm,
    } = await request.json();
    if (!confirm) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof maintenanceMode === "boolean") patch.maintenanceMode = maintenanceMode;
    if (typeof maintenanceMessage === "string") patch.maintenanceMessage = maintenanceMessage;
    if (Array.isArray(adminWhitelist)) patch.adminWhitelist = adminWhitelist.map((x) => String(x));
    if (Number.isFinite(Number(healthCheckInterval))) patch.healthCheckInterval = Number(healthCheckInterval);
    if (Number.isFinite(Number(maxRetryAttempts))) patch.maxRetryAttempts = Number(maxRetryAttempts);
    if (Number.isFinite(Number(queueWarningThreshold))) patch.queueWarningThreshold = Number(queueWarningThreshold);
    if (Number.isFinite(Number(errorAlertThreshold))) patch.errorAlertThreshold = Number(errorAlertThreshold);
    if (Number.isFinite(Number(costAlertThreshold))) patch.costAlertThreshold = Number(costAlertThreshold);
    if (typeof allowManualCronRun === "boolean") patch.allowManualCronRun = allowManualCronRun;
    if (automationToggles && typeof automationToggles === "object") patch.automationToggles = automationToggles;
    const updated = await updateOperationsSettings(patch, admin.uid);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update maintenance mode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getOperationsSettings();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load operations settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
