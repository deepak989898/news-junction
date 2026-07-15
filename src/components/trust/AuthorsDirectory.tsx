"use client";

import Link from "next/link";
import { BadgeCheck, Bot, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/ui/SectionHeading";
import NewsArticleImage from "@/components/news/NewsArticleImage";
import type { Author } from "@/lib/trust/types";
import { AUTHOR_TYPES } from "@/lib/trust/types";

function typeLabel(type: Author["authorType"], hi: boolean): string {
  const t = AUTHOR_TYPES.find((x) => x.value === type);
  return t ? (hi ? t.labelHi : t.labelEn) : type;
}

function isNonHuman(type: Author["authorType"]): boolean {
  return type === "system" || type === "ai-assisted-desk" || type === "editorial-team";
}

export default function AuthorsDirectory({ authors }: { authors: Author[] }) {
  const { language } = useLanguage();
  const hi = language === "hi";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#1a2b4c]">
          {hi ? "होम" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{hi ? "लेखक" : "Authors"}</span>
      </nav>

      <SectionHeading as="h1" size="text-2xl md:text-3xl">
        {hi ? "हमारे लेखक" : "Our Authors"}
      </SectionHeading>
      <p className="mt-2 max-w-2xl text-gray-600">
        {hi
          ? "News Junction की सामग्री हमारी संपादकीय टीम और योगदानकर्ताओं द्वारा तैयार की जाती है, जिसे स्वचालित प्रणालियों का सहयोग प्राप्त है।"
          : "Content on News Junction is produced by our editorial team and contributors, supported by automated systems."}
      </p>

      {authors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          {hi ? "अभी कोई लेखक प्रोफ़ाइल उपलब्ध नहीं है।" : "No author profiles are available yet."}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => {
            const name = hi ? a.nameHi || a.nameEn : a.nameEn || a.nameHi;
            const role = hi ? a.roleHi || a.roleEn : a.roleEn || a.roleHi;
            const bio = hi ? a.bioHi || a.bioEn : a.bioEn || a.bioHi;
            const expertise = hi ? a.expertiseHi : a.expertiseEn;
            return (
              <Link
                key={a.id}
                href={`/authors/${a.slug}`}
                className="group flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#1a2b4c]/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {a.profileImageUrl ? (
                      <NewsArticleImage
                        src={a.profileImageUrl}
                        alt={name}
                        fill
                        variant="thumb"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        {isNonHuman(a.authorType) ? <Bot size={22} /> : <Users size={22} />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate font-bold text-[#1a2b4c] group-hover:text-[#c41e20]">{name}</h2>
                      {a.isVerified ? <BadgeCheck size={16} className="shrink-0 text-[#1d4e89]" /> : null}
                    </div>
                    {role ? <p className="truncate text-sm text-gray-500">{role}</p> : null}
                    <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {typeLabel(a.authorType, hi)}
                    </span>
                  </div>
                </div>

                {bio ? <p className="mt-3 line-clamp-3 text-sm text-gray-600">{bio}</p> : null}

                {expertise && expertise.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {expertise.slice(0, 4).map((e, i) => (
                      <span key={i} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#c41e20]">
                        {e}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>
                    {typeof a.articleCount === "number" && a.articleCount > 0
                      ? `${a.articleCount.toLocaleString(hi ? "hi-IN" : "en-IN")} ${hi ? "लेख" : "articles"}`
                      : hi ? "प्रोफ़ाइल देखें" : "View profile"}
                  </span>
                  <span className="font-semibold text-[#1a2b4c] group-hover:text-[#c41e20]">
                    {hi ? "देखें →" : "View →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
