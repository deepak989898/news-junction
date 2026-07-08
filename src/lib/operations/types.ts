export type HealthStatus = "healthy" | "warning" | "critical" | "offline" | "unknown";

export interface ServiceHealthItem {
  key: string;
  label: string;
  status: HealthStatus;
  lastChecked: string;
  responseTimeMs: number | null;
  errorCount: number;
  recoveryAttempts: number;
  message?: string;
}

export interface QueueJobItem {
  id: string;
  service: string;
  queue: string;
  status: "pending" | "running" | "completed" | "failed" | "retrying" | "cancelled";
  processingTimeMs?: number | null;
  createdAt?: string;
  updatedAt?: string;
  error?: string;
}

export interface CronItem {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  status: "healthy" | "warning" | "failed" | "unknown";
  lastRun?: string;
  nextRun?: string;
  durationMs?: number | null;
  lastError?: string | null;
}

export interface OperationsSettings {
  healthCheckInterval: number;
  maxRetryAttempts: number;
  queueWarningThreshold: number;
  errorAlertThreshold: number;
  costAlertThreshold: number;
  allowManualCronRun: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  adminWhitelist: string[];
  automationToggles: {
    automationEngine: boolean;
    rssFetch: boolean;
    aiRewrite: boolean;
    translation: boolean;
    mediaGeneration: boolean;
    voiceGeneration: boolean;
    seoAutomation: boolean;
    newsletter: boolean;
    pushNotifications: boolean;
    socialPublishing: boolean;
    analyticsJobs: boolean;
    recommendationEngine: boolean;
  };
  updatedAt?: string | null;
}
