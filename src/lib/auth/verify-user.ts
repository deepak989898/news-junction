import { NextRequest } from "next/server";
import { getAdminApp } from "@/lib/firebase-admin";

export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
}

export async function verifyUser(request: NextRequest): Promise<VerifiedUser | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    getAdminApp();
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded.name as string | undefined) || undefined,
    };
  } catch {
    return null;
  }
}
