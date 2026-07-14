import { ContentActionType, ContentActionResult, AIRiskReport } from "./types";
import { callAI } from "./ai-client";
import { buildPrompt, buildRiskCheckPrompt } from "./prompt-builder";
import { getTargetField } from "./field-map";
import {
  getAISettings,
  getArticleById,
  logAIContent,
  checkCostLimits,
  createPendingChange,
  calcEstimatedCost,
  seedDefaultTemplatesIfEmpty,
} from "./server-db";

export async function executeContentAction(
  articleId: string,
  actionType: ContentActionType,
  language: "hi" | "en" | "both",
  customInstruction: string | undefined,
  userId: string,
  userName?: string
): Promise<ContentActionResult> {
  await seedDefaultTemplatesIfEmpty();

  const limitCheck = await checkCostLimits();
  if (!limitCheck.allowed) throw new Error(limitCheck.message);

  const settings = await getAISettings();
  const article = await getArticleById(articleId);
  if (!article) throw new Error("Article not found");

  const { systemPrompt, userPrompt, inputPreview } = await buildPrompt(
    actionType,
    article as Record<string, unknown>,
    settings,
    language,
    customInstruction
  );

  const { text, tokensUsed } = await callAI(settings, systemPrompt, userPrompt);
  const estimatedCost = calcEstimatedCost(settings.provider, tokensUsed);
  const field = getTargetField(actionType, language);

  let output = text.trim();
  let structured: Record<string, unknown> | undefined;
  let pendingChangeId: string | undefined;

  if (actionType === "generate_tags") {
    output = text.replace(/#/g, "").trim();
  }

  if (actionType === "faq") {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rawFaq = JSON.parse(jsonMatch[0]) as Record<string, string>[];
        const seoFaqItems = rawFaq.map((item) => ({
          questionHi: item.questionHi || item.question || item.q || "",
          answerHi: item.answerHi || item.answer || item.a || "",
          questionEn: item.questionEn || item.question || item.q || "",
          answerEn: item.answerEn || item.answer || item.a || "",
        }));
        structured = { faq: seoFaqItems, seoFaqItems };
        output = JSON.stringify(seoFaqItems);
        const { getAdminDb } = await import("@/lib/firebase-admin");
        await getAdminDb().collection("news").doc(articleId).update({
          seoFaqItems,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      /* keep raw text */
    }
  }

  const oldValue = String((article as Record<string, unknown>)[field] || "");

  if (settings.requireApprovalForAIChanges && oldValue) {
    pendingChangeId = await createPendingChange({
      articleId,
      actionType,
      field,
      oldValue: oldValue.slice(0, 2000),
      newValue: output.slice(0, 2000),
      requestedBy: userId,
      requestedByName: userName,
    });
  }

  await logAIContent({
    articleId,
    actionType,
    provider: settings.provider,
    inputPreview,
    outputPreview: output.slice(0, 300),
    usedBy: userId,
    tokensUsed,
    estimatedCost,
    status: "success",
    createdAt: new Date().toISOString(),
  });

  return {
    actionType,
    output,
    tokensUsed,
    estimatedCost,
    field,
    structured,
    pendingChangeId,
  };
}

export async function executeRiskCheck(
  articleId: string,
  userId: string
): Promise<{ report: AIRiskReport; tokensUsed: number; estimatedCost: number }> {
  await seedDefaultTemplatesIfEmpty();

  const limitCheck = await checkCostLimits();
  if (!limitCheck.allowed) throw new Error(limitCheck.message);

  const settings = await getAISettings();
  const article = await getArticleById(articleId);
  if (!article) throw new Error("Article not found");

  const { systemPrompt, userPrompt } = await buildRiskCheckPrompt(article as Record<string, unknown>);
  const { text, tokensUsed } = await callAI(settings, systemPrompt, userPrompt);
  const estimatedCost = calcEstimatedCost(settings.provider, tokensUsed);

  let report: AIRiskReport = {
    riskLevel: "medium",
    riskReasons: ["Unable to parse AI response"],
    needsHumanApproval: true,
    missingFacts: [],
    possibleBias: [],
    sourceConsistencyNotes: "Manual review recommended.",
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      report = {
        riskLevel: parsed.riskLevel || "medium",
        riskReasons: parsed.riskReasons || [],
        needsHumanApproval: Boolean(parsed.needsHumanApproval ?? parsed.riskLevel === "high"),
        missingFacts: parsed.missingFacts || [],
        possibleBias: parsed.possibleBias || [],
        sourceConsistencyNotes: parsed.sourceConsistencyNotes || "",
      };
    }
  } catch {
    report.riskReasons = [text.slice(0, 500)];
  }

  await logAIContent({
    articleId,
    actionType: "risk_check",
    provider: settings.provider,
    inputPreview: String((article as Record<string, unknown>).titleHi || (article as Record<string, unknown>).titleEn || "").slice(0, 300),
    outputPreview: JSON.stringify(report).slice(0, 300),
    usedBy: userId,
    tokensUsed,
    estimatedCost,
    status: "success",
    createdAt: new Date().toISOString(),
  });

  return { report, tokensUsed, estimatedCost };
}
