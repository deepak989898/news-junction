"use client";

import Link from "next/link";
import { BadgeCheck, Bot, Users, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/ui/SectionHeading";
import NewsArticleImage from "@/components/news/NewsArticleImage";
import type { Author } from "@/lib/trust/types";
import type { AuthorArticle } from "@/lib/trust/server";
import { AUTHOR_TYPES } from "@/lib/trust/types";

function typeLabel(type: Author["authorType"], hi: boolean): string {
  const t = AUTHOR_TYPES.find((x) => x.value === type);
  return t ? (hi ? t.labelHi : t.labelEn) : type;
}

function isNonHuman(type: Author["authorType"]): boolean {
  return type === "system" || type === "ai-assisted-desk" || type === "editorial-team";
}

function Chips({ items, tone }: { items: string[]; tone: "orange" | "sky" | "gray" }) {
  const cls =
    tone === "orange"
      ? "bg-orange-50 text-[#c41e20]"
      : tone === "sky"
        ? "bg-sky-50 text-[#1a2b4c]"
        : "bg-gray-100 text-gray-600";
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
          {it}
        </span>
      ))}
    </div>
  );
}

export default function AuthorProfile({
  author,
  articles,
}: {
  author: Author;
  articles: AuthorArticle[];
}) {
  const { language } = useLanguage();
  const hi = language === "hi";

  const name = hi ? author.nameHi || author.nameEn : author.nameEn || author.nameHi;
  const role = hi ? author.roleHi || author.roleEn : author.roleEn || author.roleHi;
  const bio = hi ? author.bioHi || author.bioEn : author.bioEn || author.bioHi;
  const expertise = hi ? author.expertiseHi : author.expertiseEn;
  const nonHuman = isNonHuman(author.authorType);
  const social = author.socialLinks || {};
  const socialEntries = Object.entries(social).filter(([, v]) => v && String(v).trim());

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#1a2b4c]">
          {hi ? "होम" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/authors" className="hover:text-[#1a2b4c]">
          {hi ? "लेखक" : "Authors"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{name}</span>
      </nav>

      <div className="rounded-xl bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {author.profileImageUrl ? (
              <NewsArticleImage src={author.profileImageUrl} alt={name} fill variant="thumb" sizes="96px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                {nonHuman ? <Bot size={36} /> : <Users size={36} />}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SectionHeading as="h1" size="text-2xl" bar={false}>
                {name}
              </SectionHeading>
              {author.isVerified ? <BadgeCheck size={20} className="text-[#1d4e89]" /> : null}
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                {typeLabel(author.authorType, hi)}
              </span>
            </div>
            {role ? <p className="mt-1 text-gray-600">{role}</p> : null}
            {bio ? <p className="mt-3 leading-relaxed text-gray-700">{bio}</p> : null}

            {(socialEntries.length > 0 || author.emailPublic) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {author.emailPublic ? (
                  <a
                    href={`mailto:${author.emailPublic}`}
                    className="inline-flex items-center gap-1.5 text-[#1a2b4c] hover:text-[#c41e20]"
                  >
                    <Mail size={14} /> {author.emailPublic}
                  </a>
                ) : null}
                {socialEntries.map(([k, v]) => (
                  <a
                    key={k}
                    href={String(v)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 capitalize text-[#1a2b4c] hover:text-[#c41e20]"
                  >
                    <Globe size={14} /> {k}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
          {expertise && expertise.length ? (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {hi ? "विशेषज्ञता" : "Expertise"}
              </h2>
              <Chips items={expertise} tone="orange" />
            </div>
          ) : null}
          {author.languages && author.languages.length ? (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {hi ? "भाषाएँ" : "Languages"}
              </h2>
              <Chips items={author.languages} tone="sky" />
            </div>
          ) : null}
          {author.coverageAreas && author.coverageAreas.length ? (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {hi ? "कवरेज क्षेत्र" : "Coverage areas"}
              </h2>
              <Chips items={author.coverageAreas} tone="gray" />
            </div>
          ) : null}
        </div>

        {/* AI / system disclosure */}
        {nonHuman ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border-l-4 border-[#e85d04] bg-orange-50/60 p-4">
            <Bot className="mt-0.5 shrink-0 text-[#e85d04]" size={18} />
            <p className="text-sm text-gray-700">
              {author.authorType === "editorial-team"
                ? hi
                  ? "यह एक संपादकीय-टीम प्रोफ़ाइल है। इस नाम के अंतर्गत प्रकाशित सामग्री News Junction टीम द्वारा तैयार की जाती है, जिसमें ऑटोमेशन और एआई सहायता शामिल हो सकती है। विवरण के लिए हमारी एआई उपयोग नीति देखें।"
                  : "This is an editorial-team profile. Content published under this name is produced by the News Junction team and may involve automation and AI assistance. See our AI Usage Policy for details."
                : hi
                  ? "यह एक स्वचालित / एआई-सहायता प्राप्त प्रोफ़ाइल है, कोई व्यक्तिगत पत्रकार नहीं। इस नाम के अंतर्गत सामग्री ऑटोमेशन और एआई की सहायता से तैयार की जाती है। विवरण के लिए हमारी एआई उपयोग नीति देखें।"
                  : "This is an automated / AI-assisted profile, not an individual journalist. Content under this name is produced with automation and AI assistance. See our AI Usage Policy for details."}{" "}
              <Link href="/ai-usage-policy" className="font-semibold text-[#c41e20] underline">
                {hi ? "एआई उपयोग नीति" : "AI Usage Policy"}
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      {/* Latest articles */}
      {articles.length > 0 ? (
        <div className="mt-6">
          <SectionHeading as="h2" size="text-xl">
            {hi ? "नवीनतम लेख" : "Latest Articles"}
          </SectionHeading>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((art) => {
              const title = hi ? art.titleHi || art.titleEn : art.titleEn || art.titleHi;
              const cat = hi ? art.categoryNameHi : art.categoryNameEn;
              return (
                <Link
                  key={art.id}
                  href={`/article/${art.slug}`}
                  className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] bg-gray-100">
                    <NewsArticleImage src={art.imageUrl} alt={title} fill variant="card" sizes="(max-width:768px) 100vw, 33vw" />
                  </div>
                  <div className="p-3">
                    {cat ? <span className="text-xs font-semibold text-[#c41e20]">{cat}</span> : null}
                    <h3 className="mt-1 line-clamp-2 font-semibold text-[#1a2b4c] group-hover:text-[#c41e20]">
                      {title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
