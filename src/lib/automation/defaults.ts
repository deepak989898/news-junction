import { AutomationSettings } from "./types";
import { DEFAULT_IMAGE_PIPELINE_SETTINGS } from "@/lib/image-pipeline/defaults";

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  automationEnabled: false,
  aiProvider: "openai",
  autoPublishLowRisk: true,
  autoPublishMediumRisk: false,
  highRiskAlwaysApproval: true,
  maxArticlesPerDay: 48,
  maxArticlesPerCategoryPerDay: 8,
  publishIntervalMinutes: 30,
  processBatchSizePerRun: 1,
  duplicateThreshold: 0.75,
  defaultAuthorName: "News Junction Team",
  defaultSourceCreditText: "Source",
  defaultCategoryImage: "/logo.png",
  generateAiImages: true,
  lastFetchRun: null,
  lastProcessRun: null,
  lastCleanupRun: null,
  imagePipeline: DEFAULT_IMAGE_PIPELINE_SETTINGS,
};

export const AUTOMATION_SETTINGS_DOC_ID = "automation";
export const HIGH_RISK_KEYWORDS = [
  "election", "politics", "political", "court", "verdict", "murder", "rape",
  "accident", "death", "killed", "violence", "riot", "protest", "religion",
  "communal", "finance", "stock", "rupee", "inflation", "health", "disease",
  "covid", "cancer", "war", "conflict", "terror", "bomb", "scam", "fraud",
  "चुनाव", "राजनीति", "अदालत", "हत्या", "दुर्घटना", "मौत", "हिंसा",
  "धर्म", "वित्त", "स्वास्थ्य", "युद्ध", "आतंक",
];

export const GDELT_QUERIES = [
  "india sourcelang:hindi",
  "india sourcelang:english",
  "india politics",
  "india economy",
];
