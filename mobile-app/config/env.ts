const required = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Missing env var: ${key}`);
  }
}

export const env = {
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "",
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
  featureFlags: process.env.EXPO_PUBLIC_FEATURE_FLAGS || "{}",
  releaseChannel: process.env.EXPO_PUBLIC_RELEASE_CHANNEL || "development",
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
};
