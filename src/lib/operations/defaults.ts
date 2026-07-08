import { OperationsSettings } from "./types";

export const OPERATIONS_SETTINGS_DOC_ID = "operationsSettings";

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = {
  healthCheckInterval: 5,
  maxRetryAttempts: 3,
  queueWarningThreshold: 100,
  errorAlertThreshold: 15,
  costAlertThreshold: 80,
  allowManualCronRun: true,
  maintenanceMode: false,
  maintenanceMessage: "We are doing maintenance. Please check back shortly.",
  adminWhitelist: [],
  automationToggles: {
    automationEngine: true,
    rssFetch: true,
    aiRewrite: true,
    translation: true,
    mediaGeneration: true,
    voiceGeneration: true,
    seoAutomation: true,
    newsletter: true,
    pushNotifications: true,
    socialPublishing: true,
    analyticsJobs: true,
    recommendationEngine: true,
  },
  updatedAt: null,
};
