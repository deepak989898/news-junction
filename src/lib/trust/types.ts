import type { Language } from "@/types";

/**
 * Trust, Transparency, Editorial & Legal system types.
 * All policy content is bilingual (Hindi + English) and editable from the admin panel.
 */

/** Page keys that use the structured-sections policy system (stored in `sitePages`). */
export type SitePageKey =
  | "about-us"
  | "editorial-policy"
  | "fact-checking-policy"
  | "corrections-policy"
  | "ethics-policy"
  | "ownership-and-funding"
  | "privacy-policy"
  | "terms-and-conditions"
  | "ai-usage-policy";

/** A single structured, bilingual section of a policy page. */
export interface PolicySection {
  id: string;
  headingEn: string;
  headingHi: string;
  /** Plain text with mini-markdown (paragraphs on blank lines, **bold**, [text](url), - bullets). */
  bodyEn: string;
  bodyHi: string;
  order: number;
  /** Render as a highlighted callout box. */
  highlight?: boolean;
}

export interface SitePage {
  pageKey: SitePageKey;
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  sections: PolicySection[];
  /** ISO string of the last substantive update shown as "Last updated". */
  lastUpdatedAt: string | null;
  published: boolean;
  seoTitleEn: string;
  seoTitleHi: string;
  seoDescriptionEn: string;
  seoDescriptionHi: string;
  version: number;
  updatedBy: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Ownership, funding, contact and legal configuration — the business-specific
 * details the admin must fill. Empty fields are omitted on public pages (never
 * shown as fake placeholders).
 */
export interface TrustConfig {
  // Ownership & funding
  siteOwnerName: string;
  legalEntityName: string;
  entityType: string;
  registrationNumber: string;
  registeredAddress: string;
  operatingAddress: string;
  founderName: string;
  editorialHead: string;
  fundingSources: string;
  advertisingDisclosure: string;
  affiliateDisclosure: string;
  politicalAffiliationDisclosure: string;
  ownershipContactEmail: string;

  // Contact channels
  generalEmail: string;
  editorialEmail: string;
  correctionsEmail: string;
  legalEmail: string;
  advertisingEmail: string;
  partnershipEmail: string;
  techSupportEmail: string;
  privacyEmail: string;
  grievanceOfficerName: string;
  grievanceEmail: string;
  phone: string;
  contactHours: string;
  postalAddress: string;
  responseTimeNote: string;

  // Legal (Terms & Conditions)
  governingLaw: string;
  jurisdictionCity: string;
  legalContactEmail: string;
  effectiveDate: string;

  // Editorial / AI wording (accurate description of the real workflow)
  editorialReviewWordingEn: string;
  editorialReviewWordingHi: string;
  aiDisclosureDefaultEn: string;
  aiDisclosureDefaultHi: string;

  updatedAt?: string | null;
  updatedBy?: string;
}

export type AuthorType =
  | "human"
  | "editorial-team"
  | "guest"
  | "system"
  | "ai-assisted-desk";

export interface AuthorSocialLinks {
  x?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

export interface Author {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  roleEn: string;
  roleHi: string;
  bioEn: string;
  bioHi: string;
  expertiseEn: string[];
  expertiseHi: string[];
  languages: string[];
  profileImageUrl: string;
  emailPublic: string;
  socialLinks: AuthorSocialLinks;
  coverageAreas: string[];
  isActive: boolean;
  isVerified: boolean;
  authorType: AuthorType;
  articleCount?: number;
  joinedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type ContactCategory =
  | "general"
  | "report-error"
  | "correction"
  | "editorial-feedback"
  | "legal"
  | "advertising"
  | "partnership"
  | "technical"
  | "other";

export type ContactStatus = "new" | "in-progress" | "resolved" | "archived";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: ContactCategory;
  subject: string;
  message: string;
  articleUrl: string;
  language: Language;
  status: ContactStatus;
  internalNotes: string;
  ipHash?: string;
  userAgent?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export const CONTACT_CATEGORIES: {
  value: ContactCategory;
  labelEn: string;
  labelHi: string;
}[] = [
  { value: "general", labelEn: "General enquiry", labelHi: "सामान्य पूछताछ" },
  { value: "report-error", labelEn: "Report an error", labelHi: "गलती की सूचना दें" },
  { value: "correction", labelEn: "Suggest a correction", labelHi: "सुधार सुझाएँ" },
  { value: "editorial-feedback", labelEn: "Editorial feedback", labelHi: "संपादकीय प्रतिक्रिया" },
  { value: "legal", labelEn: "Legal notice", labelHi: "कानूनी सूचना" },
  { value: "advertising", labelEn: "Advertising", labelHi: "विज्ञापन" },
  { value: "partnership", labelEn: "Partnership", labelHi: "साझेदारी" },
  { value: "technical", labelEn: "Technical problem", labelHi: "तकनीकी समस्या" },
  { value: "other", labelEn: "Other", labelHi: "अन्य" },
];

export const AUTHOR_TYPES: {
  value: AuthorType;
  labelEn: string;
  labelHi: string;
}[] = [
  { value: "human", labelEn: "Human journalist", labelHi: "मानव पत्रकार" },
  { value: "editorial-team", labelEn: "Editorial team", labelHi: "संपादकीय टीम" },
  { value: "guest", labelEn: "Guest contributor", labelHi: "अतिथि लेखक" },
  { value: "system", labelEn: "System / automated", labelHi: "सिस्टम / स्वचालित" },
  { value: "ai-assisted-desk", labelEn: "AI-assisted desk", labelHi: "एआई-सहायता प्राप्त डेस्क" },
];
