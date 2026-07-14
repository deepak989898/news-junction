import {
  ArticleImageAnalysis,
  ImagePipelineInput,
  ImageValidationResult,
} from "./types";

function keywordOverlapScore(textA: string, textB: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const a = new Set(tokenize(textA));
  const b = new Set(tokenize(textB));
  if (a.size === 0 || b.size === 0) return 50;

  let overlap = 0;
  for (const word of a) {
    if (b.has(word)) overlap += 1;
  }
  return Math.min(100, Math.round((overlap / Math.max(a.size, 1)) * 100 + 40));
}

export function validateImageSelection(params: {
  input: ImagePipelineInput;
  analysis: ArticleImageAnalysis;
  imageOrigin: string;
  imagePrompt?: string;
  qualityScore: number;
  clarityScore: number;
  minimumRelevanceScore: number;
  minimumQualityScore: number;
  minimumClarityScore: number;
}): ImageValidationResult {
  const rejectionReasons: string[] = [];
  const headline = `${params.input.titleEn} ${params.input.titleHi}`;
  const summary = `${params.input.summaryEn} ${params.input.summaryHi}`;

  const compareText = [headline, summary, params.analysis.primarySubject, params.analysis.visualKeywords.join(" ")].join(" ");
  const promptText = params.imagePrompt || params.analysis.factualVisualSummary;

  let relevanceScore = keywordOverlapScore(compareText, promptText);
  if (params.imageOrigin === "source" || params.imageOrigin === "official") {
    relevanceScore = Math.max(relevanceScore, 88);
  }
  if (params.imageOrigin === "fallback") {
    relevanceScore = Math.max(relevanceScore, 75);
  }

  const clarityScore = params.clarityScore;
  const qualityScore = params.qualityScore;

  let misleadingRisk: ImageValidationResult["misleadingRisk"] = "low";
  let personMismatchRisk: ImageValidationResult["personMismatchRisk"] = "low";

  if (params.analysis.isRealPersonPrimary && params.imageOrigin === "openai") {
    // Allowed: editorial AI portrait/likeness for public-figure news features.
    personMismatchRisk = "medium";
  }

  if (params.analysis.isRealPersonPrimary && params.imageOrigin === "fallback") {
    personMismatchRisk = "medium";
    rejectionReasons.push("Real-person article is still on category fallback — regenerate or upload a better image.");
  }

  if (params.analysis.riskLevel === "high" && params.imageOrigin === "openai") {
    misleadingRisk = "high";
  }

  if (qualityScore < params.minimumQualityScore) {
    rejectionReasons.push(`Quality score ${qualityScore} below minimum ${params.minimumQualityScore}.`);
  }
  if (clarityScore < params.minimumClarityScore) {
    rejectionReasons.push(`Clarity score ${clarityScore} below minimum ${params.minimumClarityScore}.`);
  }
  if (relevanceScore < params.minimumRelevanceScore && params.imageOrigin !== "fallback") {
    rejectionReasons.push(`Relevance score ${relevanceScore} below minimum ${params.minimumRelevanceScore}.`);
  }

  const approved =
    rejectionReasons.length === 0 &&
    relevanceScore >= params.minimumRelevanceScore &&
    clarityScore >= params.minimumClarityScore &&
    qualityScore >= params.minimumQualityScore &&
    misleadingRisk !== "high";

  return {
    relevanceScore,
    clarityScore,
    qualityScore,
    misleadingRisk,
    personMismatchRisk,
    approved,
    rejectionReasons,
  };
}
