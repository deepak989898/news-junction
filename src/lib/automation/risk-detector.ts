import { AutomationRiskLevel } from "./types";
import { HIGH_RISK_KEYWORDS } from "./defaults";

const MEDIUM_RISK_CATEGORIES = ["desh", "rajya", "vyapar", "swasthya", "duniya"];

export function detectRiskLevel(
  title: string,
  summary: string,
  categoryId: string
): AutomationRiskLevel {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 0;

  for (const keyword of HIGH_RISK_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) score += 2;
  }

  if (MEDIUM_RISK_CATEGORIES.includes(categoryId)) score += 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function shouldAutoPublish(
  riskLevel: AutomationRiskLevel,
  sourceAutoPublishAllowed: boolean,
  settings: {
    autoPublishLowRisk: boolean;
    autoPublishMediumRisk: boolean;
    highRiskAlwaysApproval: boolean;
  }
): boolean {
  if (!sourceAutoPublishAllowed) return false;
  if (riskLevel === "high" && settings.highRiskAlwaysApproval) return false;
  if (riskLevel === "medium") return settings.autoPublishMediumRisk;
  return settings.autoPublishLowRisk;
}
