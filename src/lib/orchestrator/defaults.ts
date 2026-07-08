import { OrchestratorSettings, WorkflowDefinition } from "./types";

export const ORCHESTRATOR_SETTINGS_DOC_ID = "orchestratorSettings";

export const DEFAULT_ORCHESTRATOR_SETTINGS: OrchestratorSettings = {
  enabled: true,
  defaultWorkflow: "default-news-pipeline",
  parallelExecution: true,
  maxConcurrentJobs: 8,
  globalRetryLimit: 3,
  workflowTimeout: 900,
  maintenanceMode: false,
  safeMode: false,
  updatedAt: null,
};

export function defaultWorkflowTemplate(now: string, actorUid?: string): WorkflowDefinition {
  return {
    name: "default-news-pipeline",
    description: "Default News Pipeline",
    enabled: true,
    trigger: "article_created",
    steps: [
      { id: "rss_fetch", name: "RSS Fetch", module: "Automation Engine", enabled: true, timeoutSec: 120, retryLimit: 2 },
      { id: "duplicate_check", name: "Duplicate Check", module: "Automation Engine", enabled: true, timeoutSec: 60, retryLimit: 2 },
      { id: "ai_rewrite", name: "AI Rewrite", module: "AI Content Studio", enabled: true, timeoutSec: 180, retryLimit: 2 },
      { id: "translation", name: "Translation", module: "AI Content Studio", enabled: true, timeoutSec: 180, retryLimit: 2 },
      { id: "editorial_review", name: "Editorial Review", module: "AI Editorial Manager", enabled: true, timeoutSec: 180, retryLimit: 2 },
      { id: "seo_optimization", name: "SEO Optimization", module: "AI SEO Manager", enabled: true, timeoutSec: 180, retryLimit: 2 },
      { id: "media_generation", name: "Media Generation", module: "AI Media Studio", enabled: true, timeoutSec: 240, retryLimit: 2, parallelGroup: "asset_pack" },
      { id: "approval_queue", name: "Approval Queue", module: "AI Operations Center", enabled: true, timeoutSec: 300, retryLimit: 1 },
      { id: "publish", name: "Publish", module: "Automation Engine", enabled: true, timeoutSec: 120, retryLimit: 1 },
      { id: "push_notification", name: "Push Notification", module: "AI Operations Center", enabled: true, timeoutSec: 120, retryLimit: 1 },
      { id: "social_distribution", name: "Social Distribution", module: "AI Social Manager", enabled: true, timeoutSec: 180, retryLimit: 2, parallelGroup: "distribution" },
      { id: "analytics_update", name: "Analytics Update", module: "AI Analytics Manager", enabled: true, timeoutSec: 120, retryLimit: 2 },
    ],
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
  };
}
