import { ImagePipelineSettings } from "./types";

export const DEFAULT_IMAGE_PIPELINE_SETTINGS: ImagePipelineSettings = {
  openAiImageEnabled: true,
  generateImagesAutomatically: true,
  realPersonAiImageDisabled: true,
  minimumRelevanceScore: 85,
  minimumQualityScore: 80,
  minimumClarityScore: 80,
  maximumRetries: 1,
  maximumDailyImages: 200,
  maximumMonthlyImages: 3000,
  manualReviewForHighRisk: true,
  allowSourceImages: true,
  allowWikimediaImages: false,
  allowedImageDomains: [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "upload.wikimedia.org",
  ],
  // Fallbacks point at real public assets until /images/fallbacks/*.webp are added.
  categoryFallbackImages: {
    desh: "/logo.png",
    rajya: "/logo.png",
    duniya: "/logo.png",
    khel: "/logo.png",
    manoranjan: "/logo.png",
    technology: "/logo.png",
    vyapar: "/logo.png",
    swasthya: "/logo.png",
    video: "/logo.png",
    court: "/logo.png",
    rajniti: "/logo.png",
    mausam: "/logo.png",
    shiksha: "/logo.png",
    vigyan: "/logo.png",
  },
  defaultCategoryImage: "/logo.png",
  minimumImageWidth: 800,
  minimumImageHeight: 450,
};

export const PERSON_ROLE_KEYWORDS = [
  "actor", "actress", "celebrity", "politician", "minister", "cm", "pm", "mp", "mla",
  "cricketer", "sportsperson", "player", "captain", "coach", "business leader", "ceo",
  "official", "journalist", "influencer", "doctor", "accused", "victim", "singer",
  "director", "producer", "star", "legend", "leader", "president", "governor",
  "अभिनेता", "अभिनेत्री", "मंत्री", "खिलाड़ी", "नेता", "सेलिब्रिटी", "कप्तान",
];

export const REAL_PERSON_INDICATORS = [
  /\b(?:actor|actress|celebrity|minister|cricketer|sportsperson|politician|leader|star|ceo|doctor|journalist)\b/i,
  /\b(?:अभिनेता|अभिनेत्री|मंत्री|खिलाड़ी|नेता|सेलिब्रिटी)\b/,
];

export const ORGANIZATION_PATTERNS = [
  /\b(?:BJP|Congress|AAP|RSS|BCCI|ICC|FIFA|NASA|ISRO|Supreme Court|Parliament|UN|WHO|IMF|World Bank)\b/gi,
  /\b(?:सुप्रीम कोर्ट|संसद|भाजप|कांग्रेस)\b/g,
];

export const LOCATION_PATTERNS = [
  /\b(?:Delhi|Mumbai|Kolkata|Chennai|Bengaluru|Hyderabad|Jaipur|Lucknow|India|USA|China|Russia|Ukraine|Gaza|Israel|Pakistan|Nepal|Bangladesh)\b/gi,
  /\b(?:दिल्ली|मुंबई|भारत|अमेरिका|चीन|पाकिस्तान)\b/g,
];
