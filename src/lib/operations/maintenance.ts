import { getAdminDb } from "@/lib/firebase-admin";
import { OPERATIONS_SETTINGS_DOC_ID } from "./defaults";

function asString(v: unknown) {
  return String(v || "");
}

export async function getMaintenanceState() {
  const doc = await getAdminDb().collection("settings").doc(OPERATIONS_SETTINGS_DOC_ID).get();
  const data = (doc.data() || {}) as Record<string, unknown>;
  return {
    enabled: Boolean(data.maintenanceMode),
    message: asString(data.maintenanceMessage || "Maintenance mode is enabled."),
    adminWhitelist: Array.isArray(data.adminWhitelist) ? data.adminWhitelist.map((x) => String(x)) : [],
  };
}

export async function isUidAdmin(uid: string): Promise<boolean> {
  const doc = await getAdminDb().collection("users").doc(uid).get();
  if (!doc.exists) return false;
  const role = asString(doc.data()?.role);
  return role === "super_admin" || role === "editor";
}
