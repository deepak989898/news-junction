"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  summary: string;
  content: string;
};

function toParagraphHtml(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function GradientHeading({
  label,
  accentClass,
}: {
  label: string;
  accentClass: string;
}) {
  return (
    <div className="mb-4">
      <h2
        className={`inline-block bg-gradient-to-r ${accentClass} bg-clip-text text-xl font-extrabold tracking-tight text-transparent md:text-2xl`}
      >
        {label}
      </h2>
      <div className={`mt-2 h-1 w-16 rounded-full bg-gradient-to-r ${accentClass}`} />
    </div>
  );
}

export default function ArticleBodySections({ summary, content }: Props) {
  const { language, t } = useLanguage();
  const [showFull, setShowFull] = useState(false);

  const shortHtml = useMemo(() => toParagraphHtml(summary), [summary]);
  const fullHtml = useMemo(() => toParagraphHtml(content), [content]);

  const fullPlain = stripTags(fullHtml);
  const shortPlain = stripTags(shortHtml);
  // Expand UI when full story is meaningfully longer than the short briefing
  const hasExpandableFull =
    Boolean(fullHtml) &&
    fullPlain.length > Math.max(shortPlain.length + 60, 160);

  // Preview first ~280 chars of full story when collapsed
  const previewHtml = useMemo(() => {
    if (!fullHtml) return "";
    const firstP = fullHtml.match(/<p[\s\S]*?<\/p>/i)?.[0];
    if (firstP) return firstP;
    const plain = fullPlain.slice(0, 280);
    return plain ? `<p>${plain}${fullPlain.length > 280 ? "…" : ""}</p>` : "";
  }, [fullHtml, fullPlain]);

  if (!shortHtml && !fullHtml) return null;

  return (
    <div className="mt-6 space-y-8">
      {shortHtml ? (
        <section aria-labelledby="article-short-heading">
          <GradientHeading
            label={t.shortContent}
            accentClass="from-[#c41e20] via-[#e85d04] to-[#f48c06]"
          />
          <div
            id="article-short-heading"
            className="article-content rounded-xl border border-orange-100/80 bg-gradient-to-br from-orange-50/60 via-white to-white p-4 text-base leading-relaxed text-gray-800 md:p-5"
            dangerouslySetInnerHTML={{ __html: shortHtml }}
          />
        </section>
      ) : null}

      {fullHtml ? (
        <section aria-labelledby="article-full-heading">
          <GradientHeading
            label={t.fullStory}
            accentClass="from-[#1a2b4c] via-[#1d4e89] to-[#0077b6]"
          />

          {!hasExpandableFull ? (
            <div
              className="article-content text-base leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{ __html: fullHtml }}
            />
          ) : (
            <div className="rounded-xl border border-sky-100/80 bg-gradient-to-br from-sky-50/50 via-white to-white p-4 md:p-5">
              {!showFull ? (
                <>
                  <div
                    className="article-content relative text-base leading-relaxed text-gray-800"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                  <div className="pointer-events-none -mt-10 h-16 bg-gradient-to-t from-white to-transparent" />
                  <button
                    type="button"
                    onClick={() => setShowFull(true)}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1a2b4c] to-[#0077b6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  >
                    {t.readFullStory}
                    <ChevronDown size={16} />
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    {language === "hi"
                      ? "पूरी खबर पढ़ने के लिए क्लिक करें — और विवरण, संदर्भ और अपडेट।"
                      : "Tap to open the full report — more context, details and updates."}
                  </p>
                </>
              ) : (
                <>
                  <div
                    id="article-full-heading"
                    className="article-content text-base leading-relaxed text-gray-800"
                    dangerouslySetInnerHTML={{ __html: fullHtml }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFull(false)}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1a2b4c] hover:text-[#c41e20]"
                  >
                    {t.showLess}
                    <ChevronUp size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
