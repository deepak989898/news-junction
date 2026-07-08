import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirebaseApp } from "./config";

export const auth = getAuth(getFirebaseApp());
export const googleProvider = new GoogleAuthProvider();
