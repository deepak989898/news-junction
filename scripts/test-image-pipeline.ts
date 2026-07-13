/**
 * Safe offline tests for image pipeline analysis (no OpenAI/Firebase calls).
 * Run: npx tsx scripts/test-image-pipeline.ts
 */
import { analyzeArticleSubject } from "../src/lib/image-pipeline/analysis";
import { decideImageStrategy } from "../src/lib/image-pipeline/decision-engine";
import { DEFAULT_IMAGE_PIPELINE_SETTINGS } from "../src/lib/image-pipeline/defaults";
import { ImagePipelineInput } from "../src/lib/image-pipeline/types";

const settings = DEFAULT_IMAGE_PIPELINE_SETTINGS;

const cases: Array<{ name: string; input: Partial<ImagePipelineInput> & { titleEn: string } }> = [
  {
    name: "Actor/Celebrity",
    input: {
      titleEn: "Tanmay Vekaria becomes emotional on set as Bagha",
      titleHi: "तनमय वेकारिया सेट पर भावुक",
      summaryEn: "TV actor Tanmay Vekaria shared an emotional moment while shooting.",
      categoryId: "manoranjan",
      categoryNameEn: "Entertainment",
    },
  },
  {
    name: "Politician",
    input: {
      titleEn: "Union Minister announces new education policy",
      titleHi: "केंद्रीय मंत्री ने नई शिक्षा नीति की घोषणा की",
      summaryEn: "The minister unveiled reforms for schools across India.",
      categoryId: "desh",
      categoryNameEn: "India",
    },
  },
  {
    name: "Cricket",
    input: {
      titleEn: "Rohit Sharma selected for upcoming Test series",
      titleHi: "रोहित शर्मा का टेस्ट सीरीज के लिए चयन",
      summaryEn: "BCCI announced the squad for the home Test series.",
      categoryId: "khel",
      categoryNameEn: "Sports",
    },
  },
  {
    name: "Court",
    input: {
      titleEn: "Supreme Court delivers verdict on electoral bonds",
      summaryEn: "The apex court ruled on the legality of anonymous political funding.",
      categoryId: "desh",
      categoryNameEn: "India",
    },
  },
  {
    name: "Health",
    input: {
      titleEn: "New study links sleep quality to heart health",
      summaryEn: "Researchers found improved sleep reduces cardiovascular risk.",
      categoryId: "swasthya",
      categoryNameEn: "Health",
    },
  },
  {
    name: "Technology",
    input: {
      titleEn: "India launches cybersecurity framework for banks",
      summaryEn: "RBI and tech regulators introduced new digital security standards.",
      categoryId: "technology",
      categoryNameEn: "Technology",
    },
  },
  {
    name: "International",
    input: {
      titleEn: "Earthquake hits Japan, tsunami alert issued",
      summaryEn: "A 7.1 magnitude quake struck off the eastern coast near Tokyo.",
      categoryId: "duniya",
      categoryNameEn: "World",
    },
  },
  {
    name: "No source image",
    input: {
      titleEn: "Startup funding rises in Bengaluru tech hub",
      summaryEn: "Venture capital inflows increased in Q2 across SaaS companies.",
      categoryId: "vyapar",
      categoryNameEn: "Business",
      originalImage: "",
    },
  },
];

function baseInput(partial: Partial<ImagePipelineInput>): ImagePipelineInput {
  return {
    articleId: "test",
    rawNewsId: "test-raw",
    titleHi: partial.titleHi || "",
    titleEn: partial.titleEn || "",
    summaryHi: partial.summaryHi || "",
    summaryEn: partial.summaryEn || "",
    categoryId: partial.categoryId || "desh",
    categoryNameEn: partial.categoryNameEn || "India",
    categoryNameHi: partial.categoryNameHi || "देश",
    sourceName: partial.sourceName || "Times of India",
    sourceUrl: partial.sourceUrl || "https://timesofindia.indiatimes.com",
    originalLink: partial.originalLink || "https://timesofindia.indiatimes.com/article",
    originalImage: partial.originalImage ?? "https://timesofindia.indiatimes.com/thumb/msid-123,width-800.jpg",
  };
}

console.log("Image Pipeline Analysis Tests\n" + "=".repeat(60));
for (const c of cases) {
  const input = baseInput(c.input);
  const analysis = analyzeArticleSubject(input);
  const decision = decideImageStrategy(analysis, input, settings);
  console.log(`\n[${c.name}]`);
  console.log(`  Subject: ${decision.primarySubject} (${decision.subjectType})`);
  console.log(`  Real person: ${decision.isRealPersonPrimary}`);
  console.log(`  Strategy: ${decision.imageStrategy}`);
  console.log(`  Reason: ${decision.reason}`);
  console.log(`  OpenAI allowed: ${decision.imageStrategy === "openai_generated" && !decision.isRealPersonPrimary}`);
}
