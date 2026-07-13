import {
  LOCATION_PATTERNS,
  ORGANIZATION_PATTERNS,
  PERSON_ROLE_KEYWORDS,
  REAL_PERSON_INDICATORS,
} from "./defaults";
import { ArticleImageAnalysis, ImagePipelineInput, SubjectType } from "./types";

function extractCapitalizedNames(text: string): string[] {
  const names = new Set<string>();
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
    /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && !/News Junction|Times of India|India Today/.test(name)) {
        names.add(name);
      }
    }
  }
  return [...names].slice(0, 6);
}

function extractOrganizations(text: string): string[] {
  const orgs = new Set<string>();
  for (const pattern of ORGANIZATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) matches.forEach((m) => orgs.add(m.trim()));
  }
  return [...orgs].slice(0, 5);
}

function extractLocation(text: string): string {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return "";
}

function extractVisualKeywords(input: ImagePipelineInput): string[] {
  const combined = `${input.titleEn} ${input.titleHi} ${input.summaryEn} ${input.summaryHi}`.toLowerCase();
  const keywords: string[] = [];

  const rules: Array<[RegExp, string]> = [
    [/court|verdict|judge|legal|petition|law|न्यायालय|अदालत/i, "court and justice setting"],
    [/election|vote|politic|parliament|minister|government|चुनाव|संसद/i, "political or government setting"],
    [/cricket|football|sport|match|olympic|खेल|क्रिकेट/i, "sports venue or equipment"],
    [/tech|ai|software|smartphone|digital|cyber|टेक/i, "technology and innovation"],
    [/health|hospital|doctor|disease|medical|स्वास्थ्य/i, "healthcare environment"],
    [/economy|market|stock|business|trade|rupee|व्यापार/i, "business and economy"],
    [/weather|flood|storm|earthquake|disaster|मौसम/i, "weather or disaster scene"],
    [/school|education|student|university|शिक्षा/i, "education campus"],
    [/space|nasa|rocket|satellite|isro|अंतरिक्ष/i, "space and science"],
    [/cinema|film|movie|entertainment|bollywood|मनोरंजन/i, "entertainment industry scene"],
    [/police|crime|arrest|investigation|पुलिस/i, "law enforcement without violence"],
  ];

  for (const [regex, cue] of rules) {
    if (regex.test(combined)) keywords.push(cue);
  }

  const location = extractLocation(combined);
  if (location) keywords.push(`${location} regional context`);

  return keywords.length ? keywords : ["clear symbolic scene representing the headline topic"];
}

function detectSubjectType(
  namedPeople: string[],
  combined: string,
  categoryId: string
): SubjectType {
  if (namedPeople.length > 0 && REAL_PERSON_INDICATORS.some((r) => r.test(combined))) {
    return "real_person";
  }
  if (
    namedPeople.length > 0 &&
    (categoryId === "khel" ||
      categoryId === "manoranjan" ||
      /cricket|football|ipl|bcci|player|captain|actor|actress|minister|mp|mla|ceo|singer|director/i.test(combined))
  ) {
    return "real_person";
  }
  if (PERSON_ROLE_KEYWORDS.some((k) => combined.includes(k.toLowerCase()))) {
    if (namedPeople.length > 0 || /\b(?:said|announced|appointed|selected|died|arrested)\b/i.test(combined)) {
      return "real_person";
    }
  }
  if (/court|verdict|judge|न्यायालय/i.test(combined)) return "court";
  if (/parliament|ministry|government|policy|संसद/i.test(combined)) return "government";
  if (/cricket|match|tournament|ipl|world cup/i.test(combined)) return "sports_event";
  if (/hospital|health|disease|medical/i.test(combined)) return "health";
  if (/tech|ai|software|cyber/i.test(combined) || categoryId === "technology") return "technology";
  if (extractLocation(combined)) return "location";
  if (extractOrganizations(combined).length > 0) return "organization";
  if (/building|bridge|infrastructure|metro|airport/i.test(combined)) return "building";
  if (/launch|summit|festival|protest|event/i.test(combined)) return "event";
  return "generic_topic";
}

function buildFactualVisualSummary(input: ImagePipelineInput, analysis: Partial<ArticleImageAnalysis>): string {
  const headline = input.titleEn || input.titleHi;
  const summary = (input.summaryEn || input.summaryHi).replace(/\s+/g, " ").slice(0, 280);
  const parts = [
    headline,
    analysis.location ? `Location: ${analysis.location}` : "",
    analysis.namedOrganizations?.length ? `Organizations: ${analysis.namedOrganizations.join(", ")}` : "",
    summary,
  ].filter(Boolean);
  return parts.join(". ");
}

export function analyzeArticleSubject(input: ImagePipelineInput): ArticleImageAnalysis {
  const combined = `${input.titleEn} ${input.titleHi} ${input.summaryEn} ${input.summaryHi}`;
  const namedPeople = extractCapitalizedNames(combined);
  const namedOrganizations = extractOrganizations(combined);
  const location = extractLocation(combined);
  const visualKeywords = extractVisualKeywords(input);
  const subjectType = detectSubjectType(namedPeople, combined.toLowerCase(), input.categoryId);
  const isRealPersonPrimary = subjectType === "real_person";

  let primarySubject = input.categoryNameEn;
  if (namedPeople.length > 0 && isRealPersonPrimary) {
    primarySubject = namedPeople[0];
  } else if (namedOrganizations.length > 0) {
    primarySubject = namedOrganizations[0];
  } else if (location) {
    primarySubject = location;
  } else {
    primarySubject = (input.titleEn || input.titleHi).slice(0, 80);
  }

  const factualVisualSummary = buildFactualVisualSummary(input, {
    location,
    namedOrganizations,
  });

  let riskLevel: ArticleImageAnalysis["riskLevel"] = "low";
  if (isRealPersonPrimary) riskLevel = "high";
  else if (subjectType === "court" || subjectType === "government") riskLevel = "medium";

  return {
    primarySubject,
    subjectType,
    namedPeople,
    namedOrganizations,
    location,
    visualKeywords,
    imageStrategy: "category_fallback",
    reason: "",
    riskLevel,
    factualVisualSummary,
    isRealPersonPrimary,
  };
}

export async function enrichAnalysisWithAi(
  input: ImagePipelineInput,
  base: ArticleImageAnalysis
): Promise<ArticleImageAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Analyze news article for image selection. Return JSON with primarySubject, subjectType, namedPeople[], namedOrganizations[], location, visualKeywords[], riskLevel, isRealPersonPrimary (boolean). Never suggest generating real person faces.",
          },
          {
            role: "user",
            content: JSON.stringify({
              titleHi: input.titleHi,
              titleEn: input.titleEn,
              summaryHi: input.summaryHi.slice(0, 400),
              summaryEn: input.summaryEn.slice(0, 400),
              category: input.categoryNameEn,
              sourceName: input.sourceName,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return base;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return base;

    const parsed = JSON.parse(content) as Partial<ArticleImageAnalysis>;
    return {
      ...base,
      primarySubject: parsed.primarySubject || base.primarySubject,
      subjectType: (parsed.subjectType as SubjectType) || base.subjectType,
      namedPeople: parsed.namedPeople?.length ? parsed.namedPeople : base.namedPeople,
      namedOrganizations: parsed.namedOrganizations?.length ? parsed.namedOrganizations : base.namedOrganizations,
      location: parsed.location || base.location,
      visualKeywords: parsed.visualKeywords?.length ? parsed.visualKeywords : base.visualKeywords,
      riskLevel: parsed.riskLevel || base.riskLevel,
      isRealPersonPrimary: parsed.isRealPersonPrimary ?? base.isRealPersonPrimary,
    };
  } catch {
    return base;
  }
}
