import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { env } from "@/config/env";

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
};

let app: FirebaseApp | undefined;

export function getFirebaseApp() {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}
