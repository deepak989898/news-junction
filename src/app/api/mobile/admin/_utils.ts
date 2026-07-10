import { NextRequest } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { getMobileAdminProfile } from "@/lib/mobile-admin/service";

export async function verifyMobileAdmin(request: NextRequest) {
  const user = await verifyUser(request);
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const profile = await getMobileAdminProfile(user.uid);
  const allowed = ["super_admin", "editor", "moderator", "viewer"].includes(profile.role);
  if (!allowed || profile.status === "disabled") {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, user, profile };
}

export function canWrite(profile: { role: string }) {
  return profile.role === "super_admin" || profile.role === "editor" || profile.role === "moderator";
}

export function isSuperAdmin(profile: { role: string }) {
  return profile.role === "super_admin";
}
