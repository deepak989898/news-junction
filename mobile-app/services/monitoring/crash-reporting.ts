import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { env } from "@/config/env";

let initialized = false;

export function initCrashReporting() {
  if (initialized) return;
  if (!env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.releaseChannel,
    release: `${Constants.expoConfig?.slug || "news-junction-mobile"}@${env.appVersion}`,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return event;
    },
  });
  Sentry.setTags({
    appVersion: env.appVersion,
    platform: Device.osName || "unknown",
    releaseChannel: env.releaseChannel,
  });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}
