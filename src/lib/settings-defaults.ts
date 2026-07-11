import { SiteSettings } from "@/types";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "News Junction",
  logoUrl: "/logo.png",
  faviconUrl: "/favicon-96.png",
  defaultLanguage: "hi",
  contactEmail: "contact@newsjunction.com",
  socialLinks: {
    facebook: "",
    instagram: "",
    x: "",
    youtube: "",
    whatsapp: "",
  },
  adsEnabled: false,
  googleAnalyticsId: "",
  googleSearchConsoleVerification: "",
  metaTitle: "News Junction - सच्ची खबर, हर नजर | REAL NEWS, REAL IMPACT",
  metaDescription:
    "News Junction - Your trusted source for Hindi and English news. Breaking news, trending stories, and in-depth coverage.",
  footerText: "© News Junction. All rights reserved.",
};

export const SETTINGS_DOC_ID = "site";
