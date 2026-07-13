import { detectRiskLevel } from "@/lib/automation/risk-detector";
import { GoogleTrendsSettings, TrendSourceCandidate, VerifiedTrendContext } from "./types";
import { selectVerifiedSources } from "./topic-score";

function extractSharedTerms(summaries: string[]): string[] {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  if (summaries.length === 0) return [];
  let shared = new Set(tokenize(summaries[0]));
  for (let i = 1; i < summaries.length; i++) {
    const tokens = new Set(tokenize(summaries[i]));
    shared = new Set([...shared].filter((t) => tokens.has(t)));
  }
  return [...shared].slice(0, 12);
}

export interface VerificationResult {
  verified: boolean;
  selectedSources: Array<Omit<TrendSourceCandidate, "id" | "createdAt"> & { selected: boolean }>;
  centralFacts: string;
  agreedEntities: string[];
  riskLevel: "low" | "medium" | "high";
  notes: string;
  rejectionReason?: string;
}

/**
 * Gate: do not generate article unless trusted sources verify the news context.
 */
export function verifyTrendSources(
  trendTitle: string,
  candidates: Array<Omit<TrendSourceCandidate, "id" | "createdAt"> | TrendSourceCandidate>,
  settings: GoogleTrendsSettings
): VerificationResult {
  const trustedCandidates = candidates.filter(
    (c) => c.sourceType !== "Hint" && c.trustLevel !== "low" && c.matchScore >= 0.3
  );

  const selected = selectVerifiedSources(trustedCandidates, settings.minimumVerifiedSources);
  const officialCount = selected.filter((c) => c.sourceType === "Official").length;

  if (settings.requireSourceVerification) {
    if (officialCount >= 1 && selected.length >= 1) {
      // OK — authoritative official source
    } else if (selected.length < settings.minimumVerifiedSources) {
      return {
        verified: false,
        selectedSources: selected,
        centralFacts: "",
        agreedEntities: [],
        riskLevel: detectRiskLevel(trendTitle, "", "desh"),
        notes: "Insufficient trusted sources",
        rejectionReason: `Need ${settings.minimumVerifiedSources} trusted sources or 1 official source; found ${selected.length}`,
      };
    }
  }

  const summaries = selected.map((s) => `${s.title}. ${s.summary}`);
  const agreedEntities = extractSharedTerms(summaries);

  if (selected.length >= 2 && agreedEntities.length < 2) {
    return {
      verified: false,
      selectedSources: selected,
      centralFacts: "",
      agreedEntities,
      riskLevel: detectRiskLevel(trendTitle, summaries.join(" "), "desh"),
      notes: "Sources do not agree on central facts",
      rejectionReason: "Conflicting or unrelated source summaries",
    };
  }

  const centralFacts = selected
    .map((s, i) => `Source ${i + 1} (${s.sourceName}): ${s.title}. ${s.summary}`)
    .join("\n");

  const riskLevel = detectRiskLevel(trendTitle, centralFacts, "desh");

  return {
    verified: true,
    selectedSources: selected.map((s) => ({ ...s, selected: true })),
    centralFacts,
    agreedEntities,
    riskLevel,
    notes: `Verified with ${selected.length} source(s)`,
  };
}

export function toVerifiedContext(
  trendId: string,
  result: VerificationResult
): VerifiedTrendContext | null {
  if (!result.verified) return null;
  return {
    trendId,
    centralFacts: result.centralFacts,
    sources: result.selectedSources,
    agreedEntities: result.agreedEntities,
    riskLevel: result.riskLevel,
  };
}
