import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";

let authInstance: Auth | null = null;

function getAuthInstance(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available on the client");
  }
  if (!authInstance) {
    const { getAuth } = require("firebase/auth") as typeof import("firebase/auth");
    const { getFirebaseApp } = require("./config") as typeof import("./config");
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export async function loginAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(getAuthInstance(), email, password);
}

export async function logoutAdmin() {
  return signOut(getAuthInstance());
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
