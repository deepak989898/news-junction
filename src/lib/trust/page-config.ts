import type { SitePageKey } from "@/lib/trust/types";

export type PolicyGroup = "company" | "editorial" | "legal";
export type EditPermission = "super_admin" | "editor";

export interface PolicyPageMeta {
  key: SitePageKey;
  /** Public route slug (top-level, no language prefix). */
  slug: string;
  path: string;
  titleEn: string;
  titleHi: string;
  group: PolicyGroup;
  /** Minimum role required to edit this page in the admin panel. */
  editPermission: EditPermission;
  /** Pages that also render business-specific TrustConfig details. */
  usesConfig?: boolean;
  /** Show an admin-only "needs legal review" banner in the editor. */
  legalReview?: boolean;
}

/**
 * Central registry of policy pages. Drives routing metadata, the admin hub,
 * footer groups and permission checks. Contact & Authors are handled by their
 * own dedicated systems and are not part of the structured-sections registry.
 */
export const POLICY_PAGES: PolicyPageMeta[] = [
  {
    key: "about-us",
    slug: "about-us",
    path: "/about-us",
    titleEn: "About Us",
    titleHi: "हमारे बारे में",
    group: "company",
    editPermission: "editor",
    usesConfig: true,
  },
  {
    key: "ownership-and-funding",
    slug: "ownership-and-funding",
    path: "/ownership-and-funding",
    titleEn: "Ownership & Funding",
    titleHi: "स्वामित्व और वित्तपोषण",
    group: "company",
    editPermission: "super_admin",
    usesConfig: true,
    legalReview: true,
  },
  {
    key: "editorial-policy",
    slug: "editorial-policy",
    path: "/editorial-policy",
    titleEn: "Editorial Policy",
    titleHi: "संपादकीय नीति",
    group: "editorial",
    editPermission: "editor",
  },
  {
    key: "fact-checking-policy",
    slug: "fact-checking-policy",
    path: "/fact-checking-policy",
    titleEn: "Fact-Checking Policy",
    titleHi: "तथ्य-जाँच नीति",
    group: "editorial",
    editPermission: "editor",
  },
  {
    key: "corrections-policy",
    slug: "corrections-policy",
    path: "/corrections-policy",
    titleEn: "Corrections Policy",
    titleHi: "सुधार नीति",
    group: "editorial",
    editPermission: "editor",
    usesConfig: true,
  },
  {
    key: "ethics-policy",
    slug: "ethics-policy",
    path: "/ethics-policy",
    titleEn: "Ethics Policy",
    titleHi: "नैतिकता नीति",
    group: "editorial",
    editPermission: "editor",
  },
  {
    key: "ai-usage-policy",
    slug: "ai-usage-policy",
    path: "/ai-usage-policy",
    titleEn: "AI Usage Policy",
    titleHi: "एआई उपयोग नीति",
    group: "editorial",
    editPermission: "editor",
  },
  {
    key: "privacy-policy",
    slug: "privacy-policy",
    path: "/privacy-policy",
    titleEn: "Privacy Policy",
    titleHi: "गोपनीयता नीति",
    group: "legal",
    editPermission: "super_admin",
    usesConfig: true,
    legalReview: true,
  },
  {
    key: "terms-and-conditions",
    slug: "terms-and-conditions",
    path: "/terms-and-conditions",
    titleEn: "Terms & Conditions",
    titleHi: "नियम और शर्तें",
    group: "legal",
    editPermission: "super_admin",
    usesConfig: true,
    legalReview: true,
  },
];

export const POLICY_PAGE_MAP: Record<SitePageKey, PolicyPageMeta> = POLICY_PAGES.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<SitePageKey, PolicyPageMeta>
);

export function getPolicyMeta(key: SitePageKey): PolicyPageMeta {
  return POLICY_PAGE_MAP[key];
}

export const POLICY_GROUP_LABELS: Record<PolicyGroup, { en: string; hi: string }> = {
  company: { en: "Company", hi: "कंपनी" },
  editorial: { en: "Editorial", hi: "संपादकीय" },
  legal: { en: "Legal", hi: "कानूनी" },
};
