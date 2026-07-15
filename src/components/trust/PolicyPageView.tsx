"use client";

import Link from "next/link";
import { Printer, Mail, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/ui/SectionHeading";
import { RichText } from "@/lib/trust/rich-text";
import type { SitePage, TrustConfig } from "@/lib/trust/types";
import { POLICY_PAGES, POLICY_GROUP_LABELS } from "@/lib/trust/page-config";

export type PolicyVariant = "default" | "about" | "ownership" | "privacy" | "terms";

interface Props {
  page: SitePage;
  variant?: PolicyVariant;
  config?: TrustConfig | null;
  aboutStats?: { categories: number; publishedArticles: number } | null;
}

function formatDate(iso: string | null, lang: "hi" | "en"): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function DefRow({ label, value }: { label: string; value?: string }) {
  const v = (value || "").trim();
  if (!v) return null;
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-2.5 sm:grid-cols-3">
      <dt className="text-sm font-semibold text-[#1a2b4c]">{label}</dt>
      <dd className="text-sm text-gray-700 sm:col-span-2 whitespace-pre-line">{v}</dd>
    </div>
  );
}

export default function PolicyPageView({ page, variant = "default", config, aboutStats }: Props) {
  const { language } = useLanguage();
  const hi = language === "hi";

  const title = hi ? page.titleHi : page.titleEn;
  const summary = hi ? page.summaryHi : page.summaryEn;
  const updated = formatDate(page.lastUpdatedAt, language);

  const sections = [...page.sections].sort((a, b) => a.order - b.order);

  const related = POLICY_PAGES.filter((p) => p.key !== page.pageKey);
  const groups: Record<string, typeof POLICY_PAGES> = {};
  for (const p of related) (groups[p.group] ||= []).push(p);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-3 text-sm text-gray-500 print:hidden" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#1a2b4c]">
          {hi ? "होम" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{title}</span>
      </nav>

      <article className="rounded-xl bg-white p-5 shadow-sm md:p-8">
        <header>
          <SectionHeading as="h1" size="text-2xl md:text-3xl">
            {title}
          </SectionHeading>
          {summary ? (
            <p className="mt-3 text-base leading-relaxed text-gray-600">{summary}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {updated ? (
              <p className="text-sm text-gray-500">
                {hi ? "अंतिम अपडेट: " : "Last updated: "}
                <time dateTime={page.lastUpdatedAt || undefined} className="font-medium text-gray-700">
                  {updated}
                </time>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-[#1a2b4c] hover:text-[#1a2b4c] print:hidden"
            >
              <Printer size={13} />
              {hi ? "प्रिंट करें" : "Print"}
            </button>
          </div>
        </header>

        {/* About stats (only real values) */}
        {variant === "about" && aboutStats && (aboutStats.publishedArticles > 0 || aboutStats.categories > 0) ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {aboutStats.publishedArticles > 0 ? (
              <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-3 text-center">
                <div className="text-2xl font-extrabold text-[#c41e20]">
                  {aboutStats.publishedArticles.toLocaleString(hi ? "hi-IN" : "en-IN")}+
                </div>
                <div className="text-xs font-medium text-gray-600">
                  {hi ? "प्रकाशित लेख" : "Published articles"}
                </div>
              </div>
            ) : null}
            {aboutStats.categories > 0 ? (
              <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-center">
                <div className="text-2xl font-extrabold text-[#1a2b4c]">{aboutStats.categories}</div>
                <div className="text-xs font-medium text-gray-600">
                  {hi ? "श्रेणियाँ" : "Categories covered"}
                </div>
              </div>
            ) : null}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-center">
              <div className="text-2xl font-extrabold text-emerald-700">2</div>
              <div className="text-xs font-medium text-gray-600">
                {hi ? "भाषाएँ (हिंदी + अंग्रेज़ी)" : "Languages (Hindi + English)"}
              </div>
            </div>
          </div>
        ) : null}

        {/* Table of contents */}
        {sections.length > 2 ? (
          <nav className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 print:hidden" aria-label="Table of contents">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#c41e20]">
              {hi ? "इस पृष्ठ पर" : "On this page"}
            </h2>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-[#1a2b4c] hover:text-[#c41e20] hover:underline"
                  >
                    {hi ? s.headingHi : s.headingEn}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* Sections */}
        <div className="mt-6 space-y-7 text-gray-700">
          {sections.map((s) => {
            const heading = hi ? s.headingHi : s.headingEn;
            const body = hi ? s.bodyHi : s.bodyEn;
            return (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-lg font-bold text-[#1a2b4c] md:text-xl">{heading}</h2>
                <div
                  className={
                    s.highlight
                      ? "mt-2 rounded-lg border-l-4 border-[#e85d04] bg-orange-50/60 p-4 text-[15px]"
                      : "mt-1 text-[15px]"
                  }
                >
                  <RichText text={body} />
                </div>
              </section>
            );
          })}
        </div>

        {/* Ownership disclosure table (config-driven, omit empty) */}
        {variant === "ownership" && config ? (
          <section id="ownership-details" className="mt-8 scroll-mt-24">
            <h2 className="text-lg font-bold text-[#1a2b4c] md:text-xl">
              {hi ? "स्वामित्व विवरण" : "Ownership Details"}
            </h2>
            <dl className="mt-2">
              <DefRow label={hi ? "स्वामी" : "Owner"} value={config.siteOwnerName} />
              <DefRow label={hi ? "कानूनी इकाई" : "Legal entity"} value={config.legalEntityName} />
              <DefRow label={hi ? "इकाई प्रकार" : "Entity type"} value={config.entityType} />
              <DefRow label={hi ? "पंजीकरण संख्या" : "Registration number"} value={config.registrationNumber} />
              <DefRow label={hi ? "पंजीकृत पता" : "Registered address"} value={config.registeredAddress} />
              <DefRow label={hi ? "संचालन पता" : "Operating address"} value={config.operatingAddress} />
              <DefRow label={hi ? "संस्थापक / प्रोपराइटर" : "Founder / Proprietor"} value={config.founderName} />
              <DefRow label={hi ? "संपादकीय प्रमुख" : "Editorial head"} value={config.editorialHead} />
            </dl>
            <h3 className="mt-6 text-base font-bold text-[#1a2b4c]">
              {hi ? "वित्तपोषण और खुलासे" : "Funding & Disclosures"}
            </h3>
            <dl className="mt-2">
              <DefRow label={hi ? "वित्तपोषण स्रोत" : "Funding sources"} value={config.fundingSources} />
              <DefRow label={hi ? "विज्ञापन खुलासा" : "Advertising disclosure"} value={config.advertisingDisclosure} />
              <DefRow label={hi ? "सहबद्ध खुलासा" : "Affiliate disclosure"} value={config.affiliateDisclosure} />
              <DefRow
                label={hi ? "राजनीतिक संबद्धता" : "Political affiliation"}
                value={config.politicalAffiliationDisclosure}
              />
              <DefRow
                label={hi ? "स्वामित्व संपर्क" : "Ownership contact"}
                value={config.ownershipContactEmail}
              />
            </dl>
            {!config.siteOwnerName && !config.legalEntityName && !config.fundingSources ? (
              <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                {hi
                  ? "स्वामित्व और वित्तपोषण विवरण जल्द ही प्रकाशित किए जाएँगे।"
                  : "Ownership and funding details will be published shortly."}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Terms legal fields (config-driven) */}
        {variant === "terms" && config ? (
          <section id="legal-details" className="mt-8 scroll-mt-24">
            <h2 className="text-lg font-bold text-[#1a2b4c] md:text-xl">
              {hi ? "कानूनी विवरण" : "Legal Details"}
            </h2>
            <dl className="mt-2">
              <DefRow label={hi ? "शासी कानून" : "Governing law"} value={config.governingLaw} />
              <DefRow label={hi ? "अधिकार क्षेत्र" : "Jurisdiction"} value={config.jurisdictionCity} />
              <DefRow label={hi ? "प्रभावी तिथि" : "Effective date"} value={config.effectiveDate} />
              <DefRow label={hi ? "कानूनी संपर्क" : "Legal contact"} value={config.legalContactEmail} />
            </dl>
          </section>
        ) : null}

        {/* Privacy grievance contact (config-driven) */}
        {variant === "privacy" && config ? (
          <section id="privacy-contact" className="mt-8 scroll-mt-24">
            <h2 className="text-lg font-bold text-[#1a2b4c] md:text-xl">
              {hi ? "गोपनीयता / शिकायत संपर्क" : "Privacy / Grievance Contact"}
            </h2>
            <dl className="mt-2">
              <DefRow label={hi ? "शिकायत अधिकारी" : "Grievance officer"} value={config.grievanceOfficerName} />
              <DefRow label={hi ? "गोपनीयता ईमेल" : "Privacy email"} value={config.privacyEmail} />
              <DefRow label={hi ? "शिकायत ईमेल" : "Grievance email"} value={config.grievanceEmail} />
            </dl>
          </section>
        ) : null}

        {/* Contact / correction CTA */}
        <div className="mt-8 rounded-xl border border-[#1a2b4c]/10 bg-[#1a2b4c]/5 p-5 print:hidden">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-[#c41e20]" size={20} />
            <div>
              <h2 className="text-base font-bold text-[#1a2b4c]">
                {hi ? "कुछ गलत दिखा या प्रश्न है?" : "Spotted something wrong or have a question?"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {hi
                  ? "हम पारदर्शिता और सुधार को महत्व देते हैं। हमसे संपर्क करें या सुधार का अनुरोध करें।"
                  : "We value transparency and corrections. Get in touch or request a correction."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/contact-us"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#c41e20] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  <Mail size={14} />
                  {hi ? "संपर्क करें" : "Contact Us"}
                </Link>
                <Link
                  href="/corrections-policy"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1a2b4c]/30 px-4 py-2 text-sm font-semibold text-[#1a2b4c] transition hover:bg-white"
                >
                  {hi ? "सुधार नीति" : "Corrections Policy"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related policies */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm print:hidden md:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#c41e20]">
          {hi ? "अन्य नीतियाँ" : "More Policies"}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {(["company", "editorial", "legal"] as const).map((g) =>
            groups[g] && groups[g].length ? (
              <div key={g}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  {hi ? POLICY_GROUP_LABELS[g].hi : POLICY_GROUP_LABELS[g].en}
                </h3>
                <ul className="space-y-1.5">
                  {groups[g].map((p) => (
                    <li key={p.key}>
                      <Link href={p.path} className="text-sm text-[#1a2b4c] hover:text-[#c41e20] hover:underline">
                        {hi ? p.titleHi : p.titleEn}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
