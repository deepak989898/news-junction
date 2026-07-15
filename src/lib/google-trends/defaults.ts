import { GoogleTrendsSettings } from "./types";

export const GOOGLE_TRENDS_SETTINGS_DOC_ID = "googleTrends";

export const DEFAULT_GOOGLE_TRENDS_SETTINGS: GoogleTrendsSettings = {
  enabled: false,
  mode: "rss",
  country: "IN",
  language: "hi",
  fetchIntervalMinutes: 60,
  minimumSearchVolume: 0,
  activeOnly: true,
  maximumTopicsPerRun: 10,
  maximumArticlesPerDay: 12,
  maximumArticlesPerCategoryPerDay: 3,
  categoryMappings: [
    { googleCategory: "All", mappedCategoryId: "desh", mappedCategoryNameHi: "देश", mappedCategoryNameEn: "India" },
    { googleCategory: "Entertainment", mappedCategoryId: "manoranjan", mappedCategoryNameHi: "मनोरंजन", mappedCategoryNameEn: "Entertainment" },
    { googleCategory: "Sports", mappedCategoryId: "khel", mappedCategoryNameHi: "खेल", mappedCategoryNameEn: "Sports" },
    { googleCategory: "Business", mappedCategoryId: "vyapar", mappedCategoryNameHi: "व्यापार", mappedCategoryNameEn: "Business" },
    { googleCategory: "Science and Technology", mappedCategoryId: "technology", mappedCategoryNameHi: "टेक्नोलॉजी", mappedCategoryNameEn: "Technology" },
    { googleCategory: "Health", mappedCategoryId: "swasthya", mappedCategoryNameHi: "स्वास्थ्य", mappedCategoryNameEn: "Health" },
    { googleCategory: "Autos and Vehicles", mappedCategoryId: "desh", mappedCategoryNameHi: "ऑटो", mappedCategoryNameEn: "Autos" },
    { googleCategory: "Politics", mappedCategoryId: "desh", mappedCategoryNameHi: "देश", mappedCategoryNameEn: "Politics" },
  ],
  requireSourceVerification: true,
  minimumVerifiedSources: 2,
  autoResearch: true,
  autoGenerate: true,
  autoPublishLowRisk: false,
  autoPublishMediumRisk: false,
  highRiskAlwaysApproval: true,
  autoPostToSocial: false,
  scheduleEnabled: true,
  scheduleTimes: ["09:00", "18:00"],
  scheduleTimezone: "Asia/Kolkata",
  lastScheduledSlot: null,
  cycleRunningAt: null,
  sourceResearchTimeoutMs: 45000,
  aiRetryLimit: 1,
  trendCooldownHours: 48,
  lastFetchRun: null,
  lastResearchRun: null,
  lastProcessRun: null,
  lastPublishRun: null,
  lastCycleRun: null,
  lastCycleSummary: null,
  lastFetchSummary: null,
  officialApiConfigured: false,
};

/** Official Google Trends RSS export — NOT webpage scraping */
export const GOOGLE_TRENDS_RSS_URLS: Record<string, string> = {
  IN: "https://trends.google.com/trending/rss?geo=IN",
};

export const CATEGORY_INFERENCE_RULES: Array<{ category: string; pattern: RegExp }> = [
  { category: "Sports", pattern: /cricket|football|ipl|match|sport|olympic|tennis|hockey|खेल|क्रिकेट/i },
  { category: "Entertainment", pattern: /movie|film|bollywood|actor|actress|song|music|serial|मनोरंजन|फिल्म/i },
  { category: "Business", pattern: /stock|market|rupee|economy|business|gdp|vyapar|व्यापार|शेयर/i },
  { category: "Science and Technology", pattern: /tech|ai|software|smartphone|cyber|space|isro|nasa|टेक/i },
  { category: "Health", pattern: /health|hospital|doctor|disease|medical|covid|स्वास्थ्य/i },
  { category: "Autos and Vehicles", pattern: /car|auto|vehicle|ev|electric vehicle|bike|motor|ऑटो/i },
  { category: "Politics", pattern: /election|minister|parliament|politic|bjp|congress|vote|चुनाव|मंत्री/i },
];
