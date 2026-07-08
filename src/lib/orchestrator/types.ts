export type ModuleHealth = "healthy" | "warning" | "critical" | "offline" | "unknown";
export type JobPriority = "critical" | "high" | "medium" | "low" | "background";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "retrying" | "cancelled";

export interface AiModuleRecord {
  id?: string;
  name: string;
  version: string;
  status: "enabled" | "disabled";
  enabled: boolean;
  dependencies: string[];
  lastHeartbeat: string;
  health: ModuleHealth;
  lastExecution?: string;
  queueStatus?: string;
  errorCount?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  module: string;
  enabled: boolean;
  timeoutSec: number;
  retryLimit: number;
  parallelGroup?: string | null;
  condition?: string | null;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: "manual" | "article_created" | "article_updated" | "scheduled" | "event";
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WorkflowExecution {
  id?: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  status: "running" | "completed" | "failed" | "cancelled" | "pending";
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  steps: Array<{
    stepId: string;
    name: string;
    status: JobStatus;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    error?: string;
  }>;
  errors: string[];
  initiatedBy?: string;
}

export interface OrchestratorSettings {
  enabled: boolean;
  defaultWorkflow: string;
  parallelExecution: boolean;
  maxConcurrentJobs: number;
  globalRetryLimit: number;
  workflowTimeout: number;
  maintenanceMode: boolean;
  safeMode: boolean;
  updatedAt?: string | null;
}
