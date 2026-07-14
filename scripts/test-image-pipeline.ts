/**
 * Safe offline tests for image pipeline analysis (no OpenAI/Firebase calls).
 * Run: npx tsx scripts/test-image-pipeline.ts
 */
import { analyzeArticleSubject } from "../src/lib/image-pipeline/analysis";
import { decideImageStrategy } from "../src/lib/image-pipeline/decision-engine";
import { DEFAULT_IMAGE_PIPELINE_SETTINGS } from "../src/lib/image-pipeline/defaults";
import { analyzeStoryHeuristic } from "../src/lib/image-pipeline/story-analyzer";
import { buildNewsVisualStory } from "../src/lib/image-pipeline/visual-story";
import { buildProfessionalNewsImagePrompt } from "../src/lib/image-pipeline/prompt-builder";
import type { NewsVisualPlan } from "../src/lib/image-pipeline/visual-plan";
import { ImagePipelineInput } from "../src/lib/image-pipeline/types";
import { fillEntertainmentTemplate, getEntertainmentLayout } from "../src/lib/image-pipeline/entertainment-styles";

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
    name: "Samantha OTT streaming",
    input: {
      titleEn: "Samantha's Film 'Maa Inti Bangaaram' Starts Streaming on JioHotstar",
      titleHi: "सामंथा की फिल्म 'माँ इंटी बंगारम' अब जियो हॉटस्टार पर स्ट्रीमिंग",
      summaryEn:
        "Samantha Ruth Prabhu's film Maa Inti Bangaaram has started streaming on JioHotstar for audiences to watch online.",
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

// Samantha / OTT offline assertion block (no API)
{
  console.log("\n" + "=".repeat(60));
  console.log("Samantha OTT entertainment story checks\n");
  const input = baseInput({
    titleEn: "Samantha's Film 'Maa Inti Bangaaram' Starts Streaming on JioHotstar",
    titleHi: "सामंथा की फिल्म 'माँ इंटी बंगारम' अब जियो हॉटस्टार पर स्ट्रीमिंग",
    summaryEn:
      "Samantha Ruth Prabhu's film Maa Inti Bangaaram has started streaming on JioHotstar for audiences to watch online.",
    categoryId: "manoranjan",
    categoryNameEn: "Entertainment",
  });
  const analysis = {
    ...analyzeArticleSubject(input),
    // Leave namedPeople as analyzer found; also cover possessive path when empty
  };
  // Second pass: clear people so possessive "Samantha's Film" must win
  const analysisPossessive = {
    ...analysis,
    namedPeople: [] as string[],
    primarySubject: "Maa Inti Bangaaram",
    isRealPersonPrimary: true,
  };
  const storyAnalysis = analyzeStoryHeuristic(input, analysisPossessive);
  const story = buildNewsVisualStory(input, analysisPossessive, storyAnalysis);
  const layout = getEntertainmentLayout(storyAnalysis.entertainmentStyle);

  const plan: NewsVisualPlan = {
    mainSubject: `Editorial portrait of Samantha as the dominant visual focus (~60-70% of frame)`,
    secondarySubjects: story.secondarySubjects,
    secondarySubject: storyAnalysis.movieTitle || "Maa Inti Bangaaram",
    locationContext: "",
    visualEvent: story.eventSummary,
    visualStory: story.visualStory,
    objects: [storyAnalysis.movieTitle, storyAnalysis.platform].filter(Boolean),
    background: "soft cinematic bokeh / premium entertainment atmosphere",
    composition: layout?.composition || story.compositionRule,
    cameraAngle: "eye-level editorial",
    lighting: layout?.lighting || "warm cinematic soft light",
    mood: layout?.mood || "premium streaming release",
    colorPalette: layout?.colorPalette || "warm cinematic tones",
    editorialStyle: layout?.editorialStyle || "IMDb News entertainment thumbnail",
    mustInclude: story.mustInclude,
    mustAvoid: story.mustAvoid,
    avoid: story.mustAvoid,
    visualPriority: storyAnalysis.visualPriority,
    frameBalance: layout?.frameBalance || "Main person ~60-70%",
    imageType: "ENTERTAINMENT",
    overlayTextRecommended: false,
    safeForGeneration: true,
    reason: "offline test plan",
    entertainmentTemplate: layout
      ? fillEntertainmentTemplate(layout.style, {
          actor: "Samantha",
          movie: storyAnalysis.movieTitle,
          platform: storyAnalysis.platform,
        })
      : undefined,
  };

  const prompt = buildProfessionalNewsImagePrompt({
    input,
    analysis: analysisPossessive,
    plan,
    neutral: false,
    story,
    storyAnalysis,
  });

  const fail: string[] = [];
  if (storyAnalysis.entertainmentStyle !== "ott_release") {
    fail.push(`expected ott_release, got ${storyAnalysis.entertainmentStyle}`);
  }
  if (story.imageType !== "ENTERTAINMENT") fail.push(`expected ENTERTAINMENT imageType, got ${story.imageType}`);
  if (!/^Samantha$/i.test(storyAnalysis.visualPriority[0] || "")) {
    fail.push(`priority[0] should be Samantha, got ${storyAnalysis.visualPriority[0]}`);
  }
  if (!storyAnalysis.visualPriority.some((p) => /bangaaram|maa inti/i.test(p))) {
    fail.push("visualPriority should include film title");
  }
  if (!storyAnalysis.visualPriority.some((p) => /jio|hotstar/i.test(p))) {
    fail.push("visualPriority should include JioHotstar");
  }
  if (story.mustInclude.some((x) => /settlement|arrest|legal-event/i.test(x))) {
    fail.push("mustInclude should not demand legal/settlement cues");
  }
  if (!story.mustAvoid.some((x) => /paper|contract|document/i.test(x))) {
    fail.push("mustAvoid should ban paperwork");
  }
  if (/legal\/settlement paperwork/i.test(story.visualStory)) {
    fail.push("visualStory must not invent settlement paperwork");
  }
  if (/settlement\/legal document cues/i.test(prompt)) {
    fail.push("prompt still contains legal document cues");
  }
  if (!/60-70%|60%|dominant/i.test(prompt)) {
    fail.push("prompt missing person frame balance");
  }
  if (!/manoranjan|entertainment|cinematic|poster/i.test(prompt)) {
    fail.push("prompt missing entertainment style cues");
  }
  if (/JioHotstar/i.test(prompt) && !/SMALLER than|smaller than|never.*larger/i.test(prompt)) {
    fail.push("prompt should constrain platform logo size");
  }

  if (fail.length) {
    console.error("FAILED:\n - " + fail.join("\n - "));
    process.exitCode = 1;
  } else {
    console.log("PASS: Samantha OTT priority + no paperwork + entertainment layout");
    console.log(`  style: ${storyAnalysis.entertainmentStyle}`);
    console.log(`  priority: ${storyAnalysis.visualPriority.join(" > ")}`);
    console.log(`  platform: ${storyAnalysis.platform}`);
    console.log(`  movie: ${storyAnalysis.movieTitle}`);
  }
}
