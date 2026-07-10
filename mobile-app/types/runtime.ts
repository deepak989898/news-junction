export interface RuntimeConfig {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  minimumVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  optionalUpdate: boolean;
  releaseNotes: string;
  featureRolloutPercent: number;
  emergencyDisable: boolean;
  featureFlags: Record<string, boolean>;
}

export interface AppHealthSnapshot {
  firebaseStatus: string;
  apiStatus: string;
  health: Record<string, unknown>;
  operations: Record<string, unknown>;
  aiBackend: Record<string, unknown>;
  timestamp: string;
}

export interface PerformanceMetric {
  name: string;
  durationMs: number;
  at: string;
  screen?: string;
  meta?: Record<string, unknown>;
}
