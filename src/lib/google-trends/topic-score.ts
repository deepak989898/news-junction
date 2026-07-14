import { GoogleTrendsSettings, TrendTopic } from "./types";
import { TrendSourceCandidate } from "./types";

export function calculateTrendPriorityScore(params: {
  searchVolume: number;
  growthPercentage: number;
  trendStatus: string;
  category: string;
  sourceCandidateCount: number;
  duplicateScore: number;
  riskLevel: string;
  fetchedAt: string | null;
}): number {
  let score = 0;

  score += Math.min(40, Math.log10(Math.max(params.searchVolume, 1)) * 8);
  score += Math.min(20, params.growthPercentage / 5);
  if (params.trendStatus === "active") score += 15;

  score += Math.min(15, params.sourceCandidateCount * 5);
  score -= params.duplicateScore * 25;

  if (params.riskLevel === "high") score -= 20;
  else if (params.riskLevel === "medium") score -= 5;
  else score += 5;

  if (params.fetchedAt) {
    const ageHours = (Date.now() - new Date(params.fetchedAt).getTime()) / 3600000;
    if (ageHours < 6) score += 15;
    else if (ageHours < 24) score += 8;
    else score -= 5;
  }

  const usefulCategories = ["Sports", "Entertainment", "Science and Technology", "Business"];
  if (usefulCategories.includes(params.category)) score += 5;

  return Math.max(0, Math.round(score));
}

export function mapGoogleCategoryToNewsJunction(
  googleCategory: string,
  settings: GoogleTrendsSettings
): { categoryId: string; nameHi: string; nameEn: string } {
  const mapping = settings.categoryMappings.find((m) => m.googleCategory === googleCategory);
  if (mapping) {
    return {
      categoryId: mapping.mappedCategoryId,
      nameHi: mapping.mappedCategoryNameHi,
      nameEn: mapping.mappedCategoryNameEn,
    };
  }
  const fallback = settings.categoryMappings.find((m) => m.googleCategory === "All");
  return {
    categoryId: fallback?.mappedCategoryId || "desh",
    nameHi: fallback?.mappedCategoryNameHi || "देश",
    nameEn: fallback?.mappedCategoryNameEn || "India",
  };
}

export function rankTrendsForProcessing(topics: TrendTopic[]): TrendTopic[] {
  return [...topics].sort((a, b) => b.priorityScore - a.priorityScore);
}

export function selectVerifiedSources(
  candidates: Array<Omit<TrendSourceCandidate, "id" | "createdAt"> | TrendSourceCandidate>,
  minimumVerified: number
): Array<Omit<TrendSourceCandidate, "id" | "createdAt"> & { selected: boolean }> {
  const trusted = candidates
    .filter((c) => c.matchScore >= 0.22 && c.trustLevel !== "low")
    .sort((a, b) => b.matchScore - a.matchScore);

  const official = trusted.filter((c) => c.sourceType === "Official");
  if (official.length >= 1 && trusted.length >= 1) {
    const selected = [official[0], ...trusted.filter((c) => c.sourceUrl !== official[0].sourceUrl)].slice(
      0,
      Math.max(minimumVerified, 2)
    );
    return selected.map((c) => ({ ...c, selected: true }));
  }

  // Prefer distinct publishers when picking the minimum set
  const picked: typeof trusted = [];
  const hosts = new Set<string>();
  for (const c of trusted) {
    let host = c.sourceName.toLowerCase();
    try {
      host = new URL(c.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      /* keep */
    }
    if (hosts.has(host) && picked.length >= minimumVerified) continue;
    hosts.add(host);
    picked.push(c);
    if (picked.length >= Math.max(minimumVerified, 2)) break;
  }

  return picked.slice(0, Math.max(minimumVerified, picked.length)).map((c) => ({ ...c, selected: true }));
}
