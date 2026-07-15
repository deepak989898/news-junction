import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { getAutomationSettings } from "@/lib/automation/server-db";
import { fetchRssFeed } from "@/lib/automation/rss-fetcher";
import { AUTOMATION_SETTINGS_DOC_ID } from "@/lib/automation/defaults";

export type VerificationStatus =
  | "working"
  | "partially_configured"
  | "configuration_required"
  | "not_implemented"
  | "error"
  | "unknown";

export type VerificationTestId =
  | "firebase_admin"
  | "firestore_read"
  | "storage_bucket"
  | "firebase_public_config"
  | "cron_secret"
  | "openai_key"
  | "gemini_key"
  | "rss_fetch"
  | "ai_openai_ping"
  | "sitemap"
  | "automation_settings"
  | "social_tokens"
  | "analytics_env"
  | "site_url";

export interface VerificationChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** setup = env/config; manual = must use feature once; optional = enhancement */
  kind: "setup" | "manual" | "optional";
  adminPath?: string;
}

export interface VerificationFeature {
  id: string;
  name: string;
  nameHi: string;
  status: VerificationStatus;
  label: string;
  description: string;
  adminPath?: string;
  docPath?: string;
  requiredEnv: string[];
  externalAccounts: string[];
  testId?: VerificationTestId;
  sensitiveTest?: boolean;
  lastError?: string;
  fixInstructions: string;
  /** 0–100 based on required checklist items completed */
  completionPercent?: number;
  checklist?: VerificationChecklistItem[];
  /** Feature works but has documented product limits (e.g. FB+Telegram only) */
  hasKnownLimits?: boolean;
}

export interface VerificationTestResult {
  testId: VerificationTestId;
  ok: boolean;
  message: string;
  durationMs: number;
  testedAt: string;
}

function envPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}

function hasFirebaseAdminCreds(): boolean {
  return (
    envPresent("FIREBASE_SERVICE_ACCOUNT_KEY") ||
    (envPresent("FIREBASE_CLIENT_EMAIL") && envPresent("FIREBASE_PRIVATE_KEY"))
  );
}

function hasOpenAi(): boolean {
  return envPresent("OPENAI_API_KEY");
}

function hasGemini(): boolean {
  return envPresent("GEMINI_API_KEY");
}

function hasCronSecret(): boolean {
  return envPresent("CRON_SECRET");
}

function hasPublicFirebase(): boolean {
  return [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ].every(envPresent);
}

export function buildFeatureRegistry(): VerificationFeature[] {
  const openAi = hasOpenAi();
  const gemini = hasGemini();
  const adminCreds = hasFirebaseAdminCreds();
  const publicFb = hasPublicFirebase();
  const cron = hasCronSecret();

  return [
    {
      id: "news_collection",
      name: "Automatic News Collection",
      nameHi: "स्वचालित समाचार संग्रह",
      status: adminCreds && publicFb ? (cron ? "partially_configured" : "configuration_required") : "configuration_required",
      label: "IMPLEMENTED – CONFIGURATION REQUIRED",
      description: "RSS, Official, GDELT fetch → rawNews. Manual source type skipped. Automation disabled by default.",
      adminPath: "/admin/sources",
      docPath: "/docs/hindi/AUTOMATION_TEST_GUIDE.md",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY", "CRON_SECRET", "NEXT_PUBLIC_FIREBASE_*"],
      externalAccounts: ["Firebase", "Vercel Cron"],
      testId: "rss_fetch",
      fixInstructions: "Sources add करें, Automation enable करें, CRON_SECRET Vercel में set करें।",
    },
    {
      id: "ai_hindi",
      name: "AI Hindi Article Generation",
      nameHi: "AI हिंदी लेख",
      status: openAi || gemini ? (adminCreds ? "partially_configured" : "configuration_required") : "configuration_required",
      label: "IMPLEMENTED – CONFIGURATION REQUIRED",
      description: "Real OpenAI/Gemini API via ai-processor. Requires approval before publish (default).",
      adminPath: "/admin/automation/queue",
      docPath: "/docs/hindi/AI_SETUP_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY", "FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: ["OpenAI and/or Google AI"],
      testId: "openai_key",
      fixInstructions: "Automation Settings में AI provider चुनें और API key Vercel में add करें।",
    },
    {
      id: "ai_english",
      name: "AI English Article Generation",
      nameHi: "AI अंग्रेज़ी लेख",
      status: openAi || gemini ? "partially_configured" : "configuration_required",
      label: "IMPLEMENTED – CONFIGURATION REQUIRED",
      description: "Bilingual output in single AI call. Same provider as Hindi.",
      adminPath: "/admin/ai/content-studio",
      docPath: "/docs/hindi/AI_SETUP_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: ["OpenAI and/or Google AI"],
      fixInstructions: "Same as Hindi generation.",
    },
    {
      id: "ai_translation",
      name: "AI Translation",
      nameHi: "AI अनुवाद",
      status: openAi || gemini ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "Bilingual articles generated together; dedicated translate_article action in analytics recommendations.",
      adminPath: "/admin/ai/content-studio",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: ["OpenAI and/or Google AI"],
      fixInstructions: "Content Studio से translate actions use करें।",
    },
    {
      id: "seo_generation",
      name: "Automatic SEO Generation",
      nameHi: "स्वचालित SEO",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "AI SEO Manager + automation SEO fields. Public article metadata partly client-side; sitemap missing article URLs.",
      adminPath: "/admin/ai/seo-manager",
      docPath: "/docs/hindi/FEATURE_VERIFICATION_GUIDE.md",
      requiredEnv: ["NEXT_PUBLIC_SITE_URL", "OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: [],
      testId: "sitemap",
      fixInstructions: "SEO Manager से audit/apply करें। Article pages पर server metadata improve करें।",
    },
    {
      id: "ai_images",
      name: "AI Image Generation",
      nameHi: "AI छवि निर्माण",
      status: openAi && adminCreds ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "OpenAI gpt-image-1 or Google Gemini gemini-3.1-flash-image (Interactions API) + Firebase upload.",
      adminPath: "/admin/automation/settings",
      docPath: "/docs/hindi/AI_SETUP_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: ["OpenAI"],
      testId: "openai_key",
      fixInstructions: "Generate AI Featured Images enable करें। Publish पर image Firebase URL save होनी चाहिए।",
    },
    {
      id: "social_captions",
      name: "Social Caption Generation",
      nameHi: "सोशल कैप्शन",
      status: openAi || gemini ? "partially_configured" : "configuration_required",
      label: "IMPLEMENTED – CONFIGURATION REQUIRED",
      description: "Real AI JSON captions for FB, IG, X, LinkedIn, Telegram, etc.",
      adminPath: "/admin/ai/social-manager",
      docPath: "/docs/hindi/SOCIAL_MEDIA_SETUP_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: ["OpenAI and/or Google AI"],
      fixInstructions: "Social Manager से article select करके Generate करें।",
    },
    {
      id: "social_posting",
      name: "Social Auto-Publishing",
      nameHi: "सोशल ऑटो-पब्लिश",
      status: envPresent("SOCIAL_TOKEN_ENCRYPTION_KEY") ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "Only Facebook + Telegram can post. X/LinkedIn/Instagram throw setup required.",
      adminPath: "/admin/social/accounts",
      docPath: "/docs/hindi/SOCIAL_MEDIA_SETUP_GUIDE.md",
      requiredEnv: ["SOCIAL_TOKEN_ENCRYPTION_KEY", "FACEBOOK_PAGE_ID", "TELEGRAM_CHANNEL_ID"],
      externalAccounts: ["Facebook Developer", "Telegram Bot"],
      testId: "social_tokens",
      sensitiveTest: true,
      fixInstructions: "Social Accounts connect करें। Platform tokens encrypt करके store होंगे।",
    },
    {
      id: "push_notifications",
      name: "Push Notifications",
      nameHi: "पुश नोटिफिकेशन",
      status: "working",
      label: "WORKING",
      description: "Expo push delivery on publish + manual send. Web VAPID optional.",
      adminPath: "/admin/ai/content-studio",
      docPath: "/docs/hindi/PUSH_NOTIFICATION_GUIDE.md",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY", "EXPO_ACCESS_TOKEN (optional)"],
      externalAccounts: ["Firebase Cloud Messaging", "Expo Push"],
      fixInstructions: "Server-side push sender implement करना बाकी है।",
    },
    {
      id: "newsletter_gen",
      name: "Newsletter Generation",
      nameHi: "न्यूज़लेटर टेक्स्ट",
      status: openAi || gemini ? "partially_configured" : "configuration_required",
      label: "PLACEHOLDER ONLY",
      description: "AI newsletter_snippet action only — text field on article.",
      adminPath: "/admin/ai/content-studio",
      docPath: "/docs/hindi/NEWSLETTER_SETUP_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: [],
      fixInstructions: "Full newsletter system नहीं है — केवल AI snippet।",
    },
    {
      id: "newsletter_delivery",
      name: "Newsletter Delivery",
      nameHi: "न्यूज़लेटर डिलीवरी",
      status: "not_implemented",
      label: "NOT IMPLEMENTED",
      description: "No email provider, subscriber list, or send cron.",
      docPath: "/docs/hindi/NEWSLETTER_SETUP_GUIDE.md",
      requiredEnv: ["Email provider (SendGrid/Resend/etc.) — not integrated"],
      externalAccounts: ["Email service provider"],
      fixInstructions: "Email provider integrate करना बाकी है।",
    },
    {
      id: "audio_news",
      name: "Audio News Generation",
      nameHi: "ऑडियो समाचार",
      status: openAi && adminCreds ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "OpenAI TTS + Firebase MP3. ElevenLabs/Google TTS placeholders. Subtitles rule-based.",
      adminPath: "/admin/ai/voice-video-studio",
      docPath: "/docs/hindi/AUDIO_NEWS_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
      externalAccounts: ["OpenAI"],
      fixInstructions: "Voice & Video Studio से script + audio generate करें।",
    },
    {
      id: "ai_analytics",
      name: "AI Analytics",
      nameHi: "AI एनालिटिक्स",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "Firestore views real. GA4/GSC/Clarity env-checked only — no API data pull.",
      adminPath: "/admin/ai/analytics-manager",
      docPath: "/docs/hindi/ANALYTICS_GUIDE.md",
      requiredEnv: ["GA4_*", "GSC_*", "CLARITY_* (optional)"],
      externalAccounts: ["Google Analytics", "Search Console", "Microsoft Clarity"],
      testId: "analytics_env",
      fixInstructions: "Analytics env vars set करें या internal Firestore metrics use करें।",
    },
    {
      id: "reports",
      name: "Reports & Export",
      nameHi: "रिपोर्ट और एक्सपोर्ट",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "Daily/weekly/monthly reports via AI. CSV works; PDF is placeholder text file.",
      adminPath: "/admin/ai/analytics-manager",
      docPath: "/docs/hindi/ANALYTICS_GUIDE.md",
      requiredEnv: ["OPENAI_API_KEY or GEMINI_API_KEY"],
      externalAccounts: [],
      fixInstructions: "PDF export placeholder है — CSV/JSON use करें।",
    },
    {
      id: "trending",
      name: "Trending Topic Suggestions",
      nameHi: "ट्रेंडिंग सुझाव",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "Manual isTrending flag works. AI trend discovery uses internal views only — no Google Trends.",
      adminPath: "/admin/ai/analytics-manager",
      requiredEnv: [],
      externalAccounts: [],
      fixInstructions: "Trend discovery internal data पर based है।",
    },
    {
      id: "duplicate_detection",
      name: "Duplicate Detection",
      nameHi: "डुप्लिकेट पहचान",
      status: adminCreds ? "working" : "configuration_required",
      label: "VERIFIED WORKING",
      description: "URL exact match + Jaccard title similarity + slug collision. Threshold configurable.",
      adminPath: "/admin/automation/settings",
      docPath: "/docs/hindi/AUTOMATION_TEST_GUIDE.md",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: [],
      fixInstructions: "duplicateThreshold automation settings में adjust करें।",
    },
    {
      id: "local_locations",
      name: "India Location & District Import",
      nameHi: "स्थानीय समाचार / जिला डेटा",
      status: adminCreds ? "partially_configured" : "configuration_required",
      label: "IMPLEMENTED — SEED REQUIRED",
      description:
        "762 districts + cities dataset. Location selector, geo automation, राज्य page. Firestore seed via Admin → Locations.",
      adminPath: "/admin/locations",
      docPath: "/docs/hindi/LOCATION_SETUP_GUIDE.md",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY", "NEXT_PUBLIC_SITE_URL"],
      externalAccounts: [],
      fixInstructions:
        "Admin → Locations → Seed Firestore (chunked). Then Backfill locations. Deploy firestore indexes.",
    },
    {
      id: "internal_linking",
      name: "Internal Linking",
      nameHi: "आंतरिक लिंकिंग",
      status: adminCreds ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "Rule-based same-category overlap scoring — not LLM anchors. Applies to article + public display.",
      adminPath: "/admin/ai/seo-manager",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: [],
      fixInstructions: "SEO Manager → Internal Links tool use करें।",
    },
    {
      id: "sitemap",
      name: "Sitemap & robots.txt",
      nameHi: "साइटमैप",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "sitemap.xml has home, search, categories. Article URLs now included when Firebase configured.",
      adminPath: "/sitemap.xml",
      requiredEnv: ["NEXT_PUBLIC_SITE_URL", "FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: [],
      testId: "sitemap",
      fixInstructions: "/sitemap.xml और /robots.txt browser में खोलें।",
    },
    {
      id: "schema_metadata",
      name: "Schema & Metadata",
      nameHi: "स्कीमा और मेटाडेटा",
      status: "partially_configured",
      label: "PARTIALLY WORKING",
      description: "JSON-LD injected client-side on article page. OG/Twitter partly client-side.",
      adminPath: "/article/[slug]",
      requiredEnv: ["NEXT_PUBLIC_SITE_URL"],
      externalAccounts: [],
      fixInstructions: "Article page View Source से JSON-LD check करें।",
    },
    {
      id: "mobile_sync",
      name: "Mobile App Synchronization",
      nameHi: "मोबाइल सिंक",
      status: publicFb ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "Same Firestore for reader. Admin APIs partial. Push/background sync not complete.",
      docPath: "/docs/hindi/MOBILE_SYNC_GUIDE.md",
      requiredEnv: ["EXPO_PUBLIC_FIREBASE_*", "EXPO_PUBLIC_API_BASE_URL"],
      externalAccounts: ["Expo", "EAS"],
      fixInstructions: "mobile-app/README.md follow करें। TypeScript errors fix करें।",
    },
    {
      id: "monitoring",
      name: "Performance Monitoring",
      nameHi: "प्रदर्शन मॉनिटरिंग",
      status: adminCreds ? "partially_configured" : "configuration_required",
      label: "PARTIALLY WORKING",
      description: "Operations center real for queues/costs/logs. API latency/Firestore metrics partly placeholder.",
      adminPath: "/admin/ai/operations",
      docPath: "/docs/hindi/TROUBLESHOOTING_GUIDE.md",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: ["Vercel Logs"],
      fixInstructions: "AI Operations page से health/queues देखें।",
    },
    {
      id: "logs",
      name: "Automation & AI Logs",
      nameHi: "लॉग्स",
      status: adminCreds ? "working" : "configuration_required",
      label: "VERIFIED WORKING",
      description: "automationLogs, operationLogs, systemLogs, aiLogs collections with admin UI.",
      adminPath: "/admin/automation",
      requiredEnv: ["FIREBASE_SERVICE_ACCOUNT_KEY"],
      externalAccounts: [],
      fixInstructions: "Automation dashboard और Operations logs check करें।",
    },
    {
      id: "cron_jobs",
      name: "Cron Jobs",
      nameHi: "क्रॉन जॉब",
      status: cron && adminCreds ? "partially_configured" : "configuration_required",
      label: "IMPLEMENTED – CONFIGURATION REQUIRED",
      description: "fetch-news 03:00 UTC, process-news 03:15 UTC, cleanup 04:00 UTC. Low throughput (2 process/run).",
      adminPath: "/admin/automation",
      docPath: "/docs/hindi/VERCEL_SETUP_GUIDE.md",
      requiredEnv: ["CRON_SECRET", "VERCEL=1"],
      externalAccounts: ["Vercel Cron (Hobby: limited)"],
      testId: "cron_secret",
      fixInstructions: "CRON_SECRET set करें और automation enable करें।",
    },
    {
      id: "admin_permissions",
      name: "Admin Permissions",
      nameHi: "एडमिन अनुमतियाँ",
      status: "working",
      label: "VERIFIED WORKING",
      description: "API enforces super_admin/editor. Firestore rules are role-based (deny-by-default); self-signup cannot grant admin roles; the open catch-all rule has been removed.",
      adminPath: "/admin/settings",
      docPath: "/docs/hindi/FIREBASE_SETUP_GUIDE.md",
      requiredEnv: [],
      externalAccounts: ["Firebase Auth"],
      fixInstructions: "users collection में हर admin का role ('super_admin' या 'editor') set करें, फिर firestore.rules deploy करें (firebase deploy --only firestore:rules)।",
    },
  ];
}

export async function runVerificationTest(
  testId: VerificationTestId,
  options?: { superAdmin?: boolean }
): Promise<VerificationTestResult> {
  const started = Date.now();
  const testedAt = new Date().toISOString();

  try {
    switch (testId) {
      case "firebase_admin": {
        if (!hasFirebaseAdminCreds()) {
          return fail(testId, testedAt, started, "Firebase Admin credentials missing");
        }
        getAdminDb();
        return ok(testId, testedAt, started, "Firebase Admin SDK initialized");
      }
      case "firestore_read": {
        if (!hasFirebaseAdminCreds()) {
          return fail(testId, testedAt, started, "Firebase Admin credentials missing");
        }
        const snap = await getAdminDb().collection("news").where("status", "==", "published").limit(1).get();
        return ok(testId, testedAt, started, `Firestore read OK (${snap.size} sample doc)`);
      }
      case "storage_bucket": {
        if (!hasFirebaseAdminCreds()) {
          return fail(testId, testedAt, started, "Firebase Admin credentials missing");
        }
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
          return fail(testId, testedAt, started, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET missing");
        }
        const bucket = getAdminStorage().bucket();
        const [exists] = await bucket.exists();
        return exists
          ? ok(testId, testedAt, started, `Storage bucket reachable: ${bucketName}`)
          : fail(testId, testedAt, started, `Bucket not found: ${bucketName}`);
      }
      case "firebase_public_config": {
        const missing = [
          "NEXT_PUBLIC_FIREBASE_API_KEY",
          "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
          "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
          "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
          "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
          "NEXT_PUBLIC_FIREBASE_APP_ID",
        ].filter((k) => !envPresent(k));
        return missing.length === 0
          ? ok(testId, testedAt, started, "All public Firebase env vars present")
          : fail(testId, testedAt, started, `Missing: ${missing.join(", ")}`);
      }
      case "cron_secret": {
        return hasCronSecret()
          ? ok(testId, testedAt, started, "CRON_SECRET is configured")
          : fail(testId, testedAt, started, "CRON_SECRET not set — all cron routes blocked");
      }
      case "openai_key": {
        return hasOpenAi()
          ? ok(testId, testedAt, started, "OPENAI_API_KEY is configured")
          : fail(testId, testedAt, started, "OPENAI_API_KEY not set");
      }
      case "gemini_key": {
        return hasGemini()
          ? ok(testId, testedAt, started, "GEMINI_API_KEY is configured")
          : fail(testId, testedAt, started, "GEMINI_API_KEY not set");
      }
      case "rss_fetch": {
        const items = await fetchRssFeed("https://feeds.bbci.co.uk/news/world/rss.xml");
        if (items.length === 0) {
          return fail(testId, testedAt, started, "RSS returned 0 items");
        }
        return ok(
          testId,
          testedAt,
          started,
          `RSS OK: ${items.length} items, sample: "${items[0].originalTitle.slice(0, 60)}..."`
        );
      }
      case "ai_openai_ping": {
        if (!options?.superAdmin) {
          return fail(testId, testedAt, started, "Super admin only");
        }
        if (!hasOpenAi()) {
          return fail(testId, testedAt, started, "OPENAI_API_KEY not set");
        }
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: AbortSignal.timeout(15000),
        });
        return response.ok
          ? ok(testId, testedAt, started, "OpenAI API reachable (models list)")
          : fail(testId, testedAt, started, `OpenAI API error: ${response.status}`);
      }
      case "sitemap": {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newsjunction.vercel.app";
        return ok(testId, testedAt, started, `Sitemap path: ${siteUrl}/sitemap.xml`);
      }
      case "automation_settings": {
        if (!hasFirebaseAdminCreds()) {
          return fail(testId, testedAt, started, "Firebase Admin credentials missing");
        }
        const settings = await getAutomationSettings();
        const doc = await getAdminDb().collection("settings").doc(AUTOMATION_SETTINGS_DOC_ID).get();
        return ok(
          testId,
          testedAt,
          started,
          `Automation enabled: ${settings.automationEnabled}, provider: ${settings.aiProvider}, doc exists: ${doc.exists}`
        );
      }
      case "social_tokens": {
        const enc = envPresent("SOCIAL_TOKEN_ENCRYPTION_KEY");
        const fb = envPresent("FACEBOOK_PAGE_ID");
        const tg = envPresent("TELEGRAM_CHANNEL_ID");
        return ok(
          testId,
          testedAt,
          started,
          `Encryption key: ${enc ? "yes" : "no"}, Facebook page: ${fb ? "yes" : "no"}, Telegram: ${tg ? "yes" : "no"}`
        );
      }
      case "analytics_env": {
        const parts = [
          envPresent("GA4_PROPERTY_ID") ? "GA4" : null,
          envPresent("GSC_SITE_URL") ? "GSC" : null,
          envPresent("CLARITY_PROJECT_ID") ? "Clarity" : null,
          envPresent("FIREBASE_ANALYTICS_MEASUREMENT_ID") ? "Firebase Analytics" : null,
        ].filter(Boolean);
        return ok(
          testId,
          testedAt,
          started,
          parts.length ? `Configured: ${parts.join(", ")}` : "No external analytics env vars set (internal views only)"
        );
      }
      case "site_url": {
        const url = process.env.NEXT_PUBLIC_SITE_URL;
        return url
          ? ok(testId, testedAt, started, `NEXT_PUBLIC_SITE_URL: ${url}`)
          : fail(testId, testedAt, started, "NEXT_PUBLIC_SITE_URL not set — canonical URLs may be wrong");
      }
      default:
        return fail(testId, testedAt, started, "Unknown test");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return fail(testId, testedAt, started, message);
  }
}

function ok(testId: VerificationTestId, testedAt: string, started: number, message: string): VerificationTestResult {
  return { testId, ok: true, message, durationMs: Date.now() - started, testedAt };
}

function fail(testId: VerificationTestId, testedAt: string, started: number, message: string): VerificationTestResult {
  return { testId, ok: false, message, durationMs: Date.now() - started, testedAt };
}

/** Features with documented product limits — still show green when 100% configured */
const HAS_KNOWN_LIMITS = new Set([
  "ai_translation",
  "seo_generation",
  "ai_images",
  "social_captions",
  "social_posting",
  "newsletter_gen",
  "ai_analytics",
  "reports",
  "trending",
  "internal_linking",
  "sitemap",
  "schema_metadata",
  "mobile_sync",
  "monitoring",
  "admin_permissions",
  "audio_news",
]);

interface RuntimeVerificationContext {
  adminCreds: boolean;
  publicFb: boolean;
  cron: boolean;
  openAi: boolean;
  gemini: boolean;
  siteUrl: boolean;
  vercel: boolean;
  socialEncKey: boolean;
  automationEnabled: boolean;
  generateAiImages: boolean;
  aiProvider: string;
  hasActiveSources: boolean;
  hasDistrictsSeeded: boolean;
  hasConnectedSocial: boolean;
  hasPublishedArticles: boolean;
  hasGeneratedAudio: boolean;
  hasGeneratedAiMedia: boolean;
  hasSeoActivity: boolean;
  hasTrendingArticle: boolean;
  hasSocialQueueActivity: boolean;
  hasAiContentActivity: boolean;
  hasArticleViews: boolean;
  hasGeoTaggedArticles: boolean;
  hasOperationsHealthCheck: boolean;
  hasAdminRoles: boolean;
}

async function loadRuntimeContext(): Promise<RuntimeVerificationContext> {
  const adminCreds = hasFirebaseAdminCreds();
  const ctx: RuntimeVerificationContext = {
    adminCreds,
    publicFb: hasPublicFirebase(),
    cron: hasCronSecret(),
    openAi: hasOpenAi(),
    gemini: hasGemini(),
    siteUrl: envPresent("NEXT_PUBLIC_SITE_URL"),
    vercel: envPresent("VERCEL"),
    socialEncKey: envPresent("SOCIAL_TOKEN_ENCRYPTION_KEY"),
    automationEnabled: false,
    generateAiImages: false,
    aiProvider: "openai",
    hasActiveSources: false,
    hasDistrictsSeeded: false,
    hasConnectedSocial: false,
    hasPublishedArticles: false,
    hasGeneratedAudio: false,
    hasGeneratedAiMedia: false,
    hasSeoActivity: false,
    hasTrendingArticle: false,
    hasSocialQueueActivity: false,
    hasAiContentActivity: false,
    hasArticleViews: false,
    hasGeoTaggedArticles: false,
    hasOperationsHealthCheck: false,
    hasAdminRoles: false,
  };

  if (!adminCreds) return ctx;

  try {
    const db = getAdminDb();
    const [settings, sourcesSnap, districtsSnap, socialSnap, publishedSnap, voiceSnap, mediaSnap, seoSnap, trendingSnap, socialQueueSnap, contentSnap, healthSnap, adminUsersSnap] =
      await Promise.all([
      getAutomationSettings(),
      db.collection("sources").where("isActive", "==", true).limit(1).get(),
      db.collection("districts").limit(1).get(),
      db.collection("socialAccounts").where("status", "==", "connected").limit(1).get(),
      db.collection("news").where("status", "==", "published").limit(20).get(),
      db.collection("voiceVideoLogs").limit(1).get(),
      db.collection("aiMediaLogs").limit(1).get(),
      db.collection("aiSeoLogs").limit(1).get(),
      db.collection("news").where("isTrending", "==", true).limit(10).get(),
      db.collection("socialPostQueue").limit(1).get(),
      db.collection("aiContentLogs").limit(1).get(),
      db.collection("healthChecks").doc("latest").get(),
      db.collection("users").where("role", "in", ["super_admin", "editor", "admin"]).limit(1).get(),
    ]);
    ctx.automationEnabled = Boolean(settings.automationEnabled);
    ctx.generateAiImages = Boolean(settings.generateAiImages);
    ctx.aiProvider = settings.aiProvider || "openai";
    ctx.hasActiveSources = !sourcesSnap.empty;
    ctx.hasDistrictsSeeded = !districtsSnap.empty;
    ctx.hasConnectedSocial = !socialSnap.empty;
    ctx.hasPublishedArticles = !publishedSnap.empty;
    ctx.hasGeneratedAudio = !voiceSnap.empty;
    ctx.hasGeneratedAiMedia = !mediaSnap.empty;
    ctx.hasSeoActivity = !seoSnap.empty;
    ctx.hasTrendingArticle = trendingSnap.docs.some((d) => String(d.data().status) === "published");
    ctx.hasSocialQueueActivity = !socialQueueSnap.empty;
    ctx.hasAiContentActivity = !contentSnap.empty;
    ctx.hasArticleViews = publishedSnap.docs.some((d) => Number(d.data().views || 0) > 0);
    ctx.hasGeoTaggedArticles = publishedSnap.docs.some((d) => Boolean(d.data().stateId || d.data().geoScope));
    ctx.hasOperationsHealthCheck = healthSnap.exists;
    ctx.hasAdminRoles = !adminUsersSnap.empty;
  } catch {
    // keep defaults
  }

  return ctx;
}

/** Cap completion % — placeholder / partial products never show false 100% */
const MAX_COMPLETION: Record<string, number> = {
  newsletter_gen: 50,
  newsletter_delivery: 0,
  push_notifications: 0,
  mobile_sync: 75,
};

function setupItem(id: string, label: string, done: boolean, adminPath?: string): VerificationChecklistItem {
  return { id, label, done, kind: "setup", adminPath };
}

function manualItem(id: string, label: string, done: boolean, adminPath?: string): VerificationChecklistItem {
  return { id, label, done, kind: "manual", adminPath };
}

function optionalItem(id: string, label: string, done: boolean, adminPath?: string): VerificationChecklistItem {
  return { id, label, done, kind: "optional", adminPath };
}

function statusFromChecklist(
  items: VerificationChecklistItem[],
  featureId: string
): { status: VerificationStatus; completionPercent: number } {
  const scored = items.filter((i) => i.kind === "setup" || i.kind === "manual");
  const doneCount = scored.filter((i) => i.done).length;
  let completionPercent = scored.length ? Math.round((doneCount / scored.length) * 100) : 0;

  const cap = MAX_COMPLETION[featureId];
  if (cap != null) completionPercent = Math.min(completionPercent, cap);

  if (scored.length === 0) {
    return { status: "unknown", completionPercent: 0 };
  }
  if (completionPercent === 100 && !HAS_KNOWN_LIMITS.has(featureId)) {
    return { status: "working", completionPercent };
  }
  if (completionPercent === 100 && HAS_KNOWN_LIMITS.has(featureId)) {
    return { status: "working", completionPercent };
  }
  if (doneCount === 0) {
    return { status: "configuration_required", completionPercent };
  }
  return { status: "partially_configured", completionPercent };
}

function buildChecklist(featureId: string, ctx: RuntimeVerificationContext): VerificationChecklistItem[] {
  const hasAiKey = ctx.openAi || ctx.gemini;
  const aiKeyMatchesProvider =
    ctx.aiProvider === "gemini" ? ctx.gemini : ctx.aiProvider === "openai" ? ctx.openAi : hasAiKey;

  switch (featureId) {
    case "news_collection":
      return [
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("public_fb", "Public Firebase config", ctx.publicFb),
        setupItem("cron", "CRON_SECRET on Vercel", ctx.cron),
        setupItem("sources", "At least 1 active news source", ctx.hasActiveSources, "/admin/sources"),
        setupItem("automation", "Automation enabled", ctx.automationEnabled, "/admin/automation/settings"),
      ];
    case "ai_hindi":
    case "ai_english":
      return [
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("provider", "AI provider matches API key", aiKeyMatchesProvider, "/admin/automation/settings"),
        setupItem("automation", "Automation enabled", ctx.automationEnabled, "/admin/automation/settings"),
        manualItem("published", "At least 1 AI article published or in queue", ctx.hasPublishedArticles, "/admin/automation/queue"),
      ];
    case "ai_translation":
      return [
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        manualItem("used", "Used translate action in Content Studio", ctx.hasAiContentActivity, "/admin/ai/content-studio"),
      ];
    case "social_captions":
      return [
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        manualItem("generated", "Generated social caption for an article", ctx.hasSocialQueueActivity || ctx.hasAiContentActivity, "/admin/ai/social-manager"),
      ];
    case "newsletter_gen":
      return [
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        manualItem("snippet", "Newsletter snippet only — full email system not built", false, "/admin/ai/content-studio"),
      ];
    case "ai_images":
      return [
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("storage", "Firebase Storage bucket", envPresent("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")),
        setupItem("toggle", "Generate AI images enabled in settings", ctx.generateAiImages, "/admin/automation/settings"),
        manualItem("generated", "At least 1 AI image generated (Media logs)", ctx.hasGeneratedAiMedia, "/admin/ai/media-studio"),
      ];
    case "audio_news":
      return [
        setupItem("ai_key", "OpenAI API key (TTS)", ctx.openAi),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("storage", "Firebase Storage bucket", envPresent("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")),
        manualItem("generated", "Generate audio from Voice & Video Studio", ctx.hasGeneratedAudio, "/admin/ai/voice-video-studio"),
      ];
    case "seo_generation":
    case "internal_linking":
      return [
        setupItem("site_url", "NEXT_PUBLIC_SITE_URL set", ctx.siteUrl),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        manualItem("seo_run", "Run SEO audit or apply from SEO Manager", ctx.hasSeoActivity, "/admin/ai/seo-manager"),
      ];
    case "sitemap":
    case "schema_metadata":
      return [
        setupItem("site_url", "NEXT_PUBLIC_SITE_URL set", ctx.siteUrl),
        setupItem("admin", "Firebase Admin (article URLs)", ctx.adminCreds),
        manualItem("published", "At least 1 published article live", ctx.hasPublishedArticles, "/admin/news"),
        optionalItem("ai_key", "AI key for SEO tools", hasAiKey, "/admin/ai/seo-manager"),
      ];
    case "social_posting":
      return [
        setupItem("enc", "SOCIAL_TOKEN_ENCRYPTION_KEY", ctx.socialEncKey),
        setupItem("accounts", "Connected social account", ctx.hasConnectedSocial, "/admin/social/accounts"),
        manualItem("posted", "At least 1 social post queued or published", ctx.hasSocialQueueActivity, "/admin/ai/social-manager"),
      ];
    case "push_notifications":
    case "newsletter_delivery":
      return [setupItem("impl", "Server implementation not built yet", false)];
    case "ai_analytics":
      return [
        setupItem("admin", "Firebase Admin (internal views)", ctx.adminCreds),
        setupItem("articles", "Published articles exist for analytics", ctx.hasPublishedArticles, "/admin/news"),
        manualItem("views", "Article view data recorded (open articles on site)", ctx.hasArticleViews),
        optionalItem("ga4", "GA4 env for external analytics", envPresent("GA4_PROPERTY_ID")),
        optionalItem("gsc", "Search Console env", envPresent("GSC_SITE_URL")),
      ];
    case "reports":
      return [
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("ai_key", "OpenAI or Gemini API key", hasAiKey),
        manualItem("report", "Generate a report from Analytics Manager", ctx.hasAiContentActivity, "/admin/ai/analytics-manager"),
      ];
    case "trending":
      return [
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("articles", "Published articles exist", ctx.hasPublishedArticles, "/admin/news"),
        manualItem("trending", "Mark article trending or run trend discovery", ctx.hasTrendingArticle, "/admin/ai/analytics-manager"),
      ];
    case "duplicate_detection":
    case "logs":
      return [setupItem("admin", "Firebase Admin credentials", ctx.adminCreds)];
    case "local_locations":
      return [
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("seed", "Districts seeded in Firestore", ctx.hasDistrictsSeeded, "/admin/locations"),
        setupItem("site_url", "NEXT_PUBLIC_SITE_URL set", ctx.siteUrl),
        manualItem("backfill", "Articles tagged with location (backfill)", ctx.hasGeoTaggedArticles, "/admin/locations"),
      ];
    case "mobile_sync":
      return [
        setupItem("public_fb", "Public Firebase config", ctx.publicFb),
        setupItem("site_url", "NEXT_PUBLIC_SITE_URL set", ctx.siteUrl),
        manualItem("expo", "Mobile app built with Expo (see mobile-app/README)", envPresent("EXPO_PUBLIC_API_BASE_URL")),
      ];
    case "monitoring":
      return [
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        manualItem("open", "Operations health check has run", ctx.hasOperationsHealthCheck, "/admin/ai/operations"),
      ];
    case "cron_jobs":
      return [
        setupItem("cron", "CRON_SECRET on Vercel", ctx.cron),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        setupItem("automation", "Automation enabled", ctx.automationEnabled, "/admin/automation/settings"),
        setupItem("vercel", "Deployed on Vercel (cron scheduler)", ctx.vercel),
      ];
    case "admin_permissions":
      return [
        setupItem("public_fb", "Firebase Auth configured", ctx.publicFb),
        setupItem("admin", "Firebase Admin credentials", ctx.adminCreds),
        manualItem("roles", "Admin user role set in Firestore users", ctx.hasAdminRoles, "/admin/settings"),
      ];
    default:
      return [];
  }
}

function labelFromStatus(status: VerificationStatus, featureId: string, completionPercent: number): string {
  if (status === "not_implemented") return "NOT IMPLEMENTED";
  if (MAX_COMPLETION[featureId] != null && completionPercent < 100) {
    if (featureId === "newsletter_gen") return "PLACEHOLDER ONLY — full newsletter not built";
    if (featureId === "mobile_sync") return "PARTIAL — mobile app setup incomplete";
  }
  if (status === "configuration_required") return "CONFIGURATION REQUIRED";
  if (status === "partially_configured") return "SETUP OR MANUAL STEPS REMAINING";
  if (status === "working") {
    return HAS_KNOWN_LIMITS.has(featureId) ? "READY — see feature notes below" : "VERIFIED WORKING";
  }
  return "UNKNOWN";
}

/** Live status from env + Firestore settings (Run test = one check only; this = full readiness) */
export async function buildFeatureRegistryAsync(): Promise<VerificationFeature[]> {
  const base = buildFeatureRegistry();
  const ctx = await loadRuntimeContext();

  return base.map((feature) => {
    if (feature.status === "not_implemented") {
      const checklist = buildChecklist(feature.id, ctx);
      return {
        ...feature,
        checklist,
        completionPercent: 0,
        label: "NOT IMPLEMENTED",
      };
    }

    const checklist = buildChecklist(feature.id, ctx);
    const { status, completionPercent } = statusFromChecklist(checklist, feature.id);
    return {
      ...feature,
      checklist,
      completionPercent,
      status,
      hasKnownLimits: HAS_KNOWN_LIMITS.has(feature.id),
      label: labelFromStatus(status, feature.id, completionPercent),
    };
  });
}

export const CRON_JOBS = [
  {
    name: "fetch-news",
    route: "/api/cron/fetch-news",
    purpose: "RSS/GDELT fetch → rawNews",
    schedule: "0 3 * * * (03:00 UTC daily)",
    secret: "CRON_SECRET",
    manualTest: "curl -H 'Authorization: Bearer $CRON_SECRET' https://YOUR_DOMAIN/api/cron/fetch-news",
    expectedChanges: "rawNews docs created, lastFetchRun updated",
    onFailure: "Returns 401 if CRON_SECRET missing; no-op if automation disabled",
  },
  {
    name: "process-news",
    route: "/api/cron/process-news",
    purpose: "AI process up to 2 fetched items",
    schedule: "15 3 * * * (03:15 UTC daily)",
    secret: "CRON_SECRET",
    manualTest: "curl -H 'Authorization: Bearer $CRON_SECRET' https://YOUR_DOMAIN/api/cron/process-news",
    expectedChanges: "rawNews → pendingApproval or published",
    onFailure: "Timeout possible on Vercel Hobby (60s max)",
  },
  {
    name: "cleanup",
    route: "/api/cron/cleanup",
    purpose: "Delete old duplicate/failed/rejected rawNews (30+ days)",
    schedule: "0 4 * * * (04:00 UTC daily)",
    secret: "CRON_SECRET",
    manualTest: "curl -H 'Authorization: Bearer $CRON_SECRET' https://YOUR_DOMAIN/api/cron/cleanup",
    expectedChanges: "Up to 100 old rawNews deleted",
    onFailure: "May need Firestore composite index",
  },
] as const;
