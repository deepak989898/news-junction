import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export interface VerifiedAdmin {
  uid: string;
  role: "super_admin" | "editor";
  email?: string;
  name?: string;
}

export async function verifyAdmin(request: NextRequest): Promise<VerifiedAdmin | null> {
  getAdminApp();
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const role = userDoc.data()?.role;
    if (!["super_admin", "editor"].includes(role)) return null;

    return {
      uid: decoded.uid,
      role: role as VerifiedAdmin["role"],
      email: userDoc.data()?.email,
      name: userDoc.data()?.name,
    };
  } catch {
    return null;
  }
}

export async function verifySuperAdmin(request: NextRequest): Promise<VerifiedAdmin | null> {
  const admin = await verifyAdmin(request);
  if (!admin || admin.role !== "super_admin") return null;
  return admin;
}
