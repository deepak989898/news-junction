import { ArticleImageAnalysis, ImagePipelineInput } from "./types";

export const QUALITY_DIRECTIVES = `Technical quality requirements:
- Ultra-sharp focus on the main subject, crisp edges, no motion blur, no soft focus
- Professional Reuters/AP/BBC photojournalism quality with proper exposure and rich natural colors
- High clarity and contrast — NOT faded, NOT washed out, NOT hazy, NOT low-resolution looking
- Single unified photograph only — absolutely NO split-screen, NO diptych, NO side-by-side panels, NO before/after layout, NO collage, NO multiple frames
- ONE coherent scene filling the entire 16:9 frame edge to edge`;

const CATEGORY_STYLE: Record<string, string> = {
  khel: "sports stadium, equipment, or team atmosphere without identifiable athletes",
  technology: "modern technology, devices, innovation lab, or digital infrastructure",
  vyapar: "business district, markets, or corporate editorial scene",
  swasthya: "healthcare facility, medical research, or public health setting",
  manoranjan: "cinema, stage, film production, or cultural event scene without celebrity faces",
  duniya: "international landmark or global location matching the story region",
  rajya: "Indian state landmark, regional civic scene, or government building exterior",
  desh: "Indian national civic context, parliament exterior, or major city skyline",
  video: "broadcast news studio or media production environment",
  court: "court building exterior, scales of justice, legal documents — no judge faces",
  rajniti: "parliament or ministry building exterior, podium, policy documents — no politician faces",
  mausam: "weather map, storm clouds, flood scene, or seasonal landscape",
  shiksha: "school campus, classroom, or university building",
  vigyan: "laboratory, research facility, or scientific equipment",
};

export function buildNeutralIllustrationPrompt(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis
): string {
  const style = CATEGORY_STYLE[input.categoryId] || "editorial news photography";
  const headline = input.titleEn || input.titleHi;

  return `Create a high-quality editorial news featured image about:
${analysis.factualVisualSummary}.

Main visible subject:
${analysis.isRealPersonPrimary ? "neutral symbolic scene related to the topic — NOT any real person's face or likeness" : analysis.primarySubject}.

Required context:
${analysis.location ? `Location: ${analysis.location}. ` : ""}${analysis.visualKeywords.join("; ")}.

Style:
realistic editorial photography with tack-sharp detail, strong contrast, and natural vibrant colors — suitable for ${input.categoryNameEn} news.

${QUALITY_DIRECTIVES}

Composition:
clear central subject, uncluttered background, strong visual hierarchy, suitable for a news website thumbnail and large article hero image.

Do not include:
unverified people, fake celebrity likeness, misleading event recreation, logos, watermarks, random text, distorted anatomy, blurred faces, extra fingers, unreadable writing or unrelated objects.

Aspect ratio:
16:9 landscape.

Category guidance:
${style}.

The visual must immediately communicate the meaning of this headline:
${headline}.`;
}

export function buildOpenAiImagePrompt(
  input: ImagePipelineInput,
  analysis: ArticleImageAnalysis
): string {
  const style = CATEGORY_STYLE[input.categoryId] || "editorial news photography";
  const headline = input.titleEn || input.titleHi;

  return `Create a high-quality editorial news featured image about:
${analysis.factualVisualSummary}.

Main visible subject:
${analysis.primarySubject}.

Required context:
${analysis.location ? `Location: ${analysis.location}. ` : ""}${analysis.visualKeywords.join("; ")}.

Style:
photorealistic editorial news photography with tack-sharp detail, strong contrast, and natural vibrant colors.

${QUALITY_DIRECTIVES}

Composition:
clear central subject, uncluttered background, strong visual hierarchy, suitable for a news website thumbnail and large article hero image, center-weighted focal point.

Do not include:
unverified people, fake celebrity likeness, misleading event recreation, logos, watermarks, random text, distorted anatomy, blurred faces, extra fingers, unreadable writing or unrelated objects.

Aspect ratio:
16:9 landscape.

Category style:
${style}.

The visual must immediately communicate the meaning of this headline:
${headline}.`;
}
