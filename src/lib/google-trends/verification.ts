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

function distinctPublishers(sources: Array<{ sourceUrl: string; sourceName: string }>): number {
  const set = new Set<string>();
  for (const s of sources) {
    try {
      set.add(new URL(s.sourceUrl).hostname.replace(/^www\./, ""));
    } catch {
      set.add(s.sourceName.toLowerCase());
    }
  }
  return set.size;
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
    (c) => c.sourceType !== "Hint" && c.trustLevel !== "low" && c.matchScore >= 0.22
  );

  const selected = selectVerifiedSources(trustedCandidates, settings.minimumVerifiedSources);
  const officialCount = selected.filter((c) => c.sourceType === "Official").length;
  const publishers = distinctPublishers(selected);

  if (settings.requireSourceVerification) {
    const okOfficial = officialCount >= 1 && selected.length >= 1;
    const okMultiTrusted = selected.length >= settings.minimumVerifiedSources;
    // Google Trends related-news links often come from different publishers — count as verification.
    const okDistinctPublishers =
      publishers >= Math.min(2, settings.minimumVerifiedSources) && selected.length >= 1;

    if (!okOfficial && !okMultiTrusted && !okDistinctPublishers) {
      return {
        verified: false,
        selectedSources: selected,
        centralFacts: "",
        agreedEntities: [],
        riskLevel: detectRiskLevel(trendTitle, "", "desh"),
        notes: "Insufficient matching articles from Sources / related news",
        rejectionReason: `Need ${settings.minimumVerifiedSources} trusted matching articles or 1 official source; found ${selected.length} (active CMS sources are scanned, but articles must match this trend)`,
      };
    }
  }

  const summaries = selected.map((s) => `${s.title}. ${s.summary}`);
  const agreedEntities = extractSharedTerms(summaries);

  // Soften agreement check when sources are high-match Trends-related news
  const strongMatches = selected.filter((s) => s.matchScore >= 0.7).length;
  if (selected.length >= 2 && agreedEntities.length < 1 && strongMatches < 2) {
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
    notes: `Verified with ${selected.length} source(s) across ${publishers} publisher(s)`,
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
