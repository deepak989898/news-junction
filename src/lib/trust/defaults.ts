import type { TrustConfig } from "@/lib/trust/types";

export const TRUST_CONFIG_DOC_ID = "config";
export const TRUST_COLLECTION = "trustSettings";
export const SITE_PAGES_COLLECTION = "sitePages";
export const AUTHORS_COLLECTION = "authors";
export const CONTACT_SUBMISSIONS_COLLECTION = "contactSubmissions";

/**
 * Default trust configuration. All business-specific fields are intentionally
 * EMPTY — nothing is fabricated. The admin fills these; empty values are hidden
 * on public pages instead of showing placeholder/fake data.
 */
export const DEFAULT_TRUST_CONFIG: TrustConfig = {
  siteOwnerName: "",
  legalEntityName: "",
  entityType: "",
  registrationNumber: "",
  registeredAddress: "",
  operatingAddress: "",
  founderName: "",
  editorialHead: "",
  fundingSources: "",
  advertisingDisclosure: "",
  affiliateDisclosure: "",
  politicalAffiliationDisclosure: "",
  ownershipContactEmail: "",

  generalEmail: "",
  editorialEmail: "",
  correctionsEmail: "",
  legalEmail: "",
  advertisingEmail: "",
  partnershipEmail: "",
  techSupportEmail: "",
  privacyEmail: "",
  grievanceOfficerName: "",
  grievanceEmail: "",
  phone: "",
  contactHours: "",
  postalAddress: "",
  responseTimeNote: "",

  governingLaw: "",
  jurisdictionCity: "",
  legalContactEmail: "",
  effectiveDate: "",

  editorialReviewWordingEn:
    "AI-assisted content may be reviewed automatically or manually according to risk level and our editorial workflow. Higher-risk topics receive additional checks before or after publication.",
  editorialReviewWordingHi:
    "एआई-सहायता प्राप्त सामग्री की समीक्षा जोखिम स्तर और हमारी संपादकीय प्रक्रिया के अनुसार स्वचालित रूप से या मैन्युअल रूप से की जा सकती है। अधिक संवेदनशील विषयों की प्रकाशन से पहले या बाद में अतिरिक्त जाँच की जाती है।",
  aiDisclosureDefaultEn:
    "This article was produced with AI assistance and may be reviewed automatically or manually based on its topic and risk level.",
  aiDisclosureDefaultHi:
    "यह लेख एआई सहायता से तैयार किया गया है और इसके विषय व जोखिम स्तर के आधार पर इसकी स्वचालित या मैन्युअल समीक्षा की जा सकती है।",

  updatedAt: null,
  updatedBy: "",
};

/**
 * Fields that must be configured before the Ownership & Funding page and legal
 * pages can be considered "complete" in the admin checklist. These are never
 * shown as fake data publicly — the admin is warned (not the public).
 */
export const REQUIRED_TRUST_FIELDS: { key: keyof TrustConfig; labelEn: string }[] = [
  { key: "siteOwnerName", labelEn: "Owner name" },
  { key: "legalEntityName", labelEn: "Legal entity" },
  { key: "generalEmail", labelEn: "General contact email" },
  { key: "correctionsEmail", labelEn: "Corrections email" },
  { key: "privacyEmail", labelEn: "Privacy email" },
  { key: "legalEmail", labelEn: "Legal notice email" },
  { key: "operatingAddress", labelEn: "Registered or operating address" },
  { key: "governingLaw", labelEn: "Governing law" },
  { key: "jurisdictionCity", labelEn: "Jurisdiction" },
  { key: "editorialHead", labelEn: "Editorial contact / head" },
  { key: "fundingSources", labelEn: "Funding disclosure" },
];

export function getMissingTrustFields(config: TrustConfig): string[] {
  return REQUIRED_TRUST_FIELDS.filter(
    (f) => !String(config[f.key] ?? "").trim()
  ).map((f) => f.labelEn);
}
