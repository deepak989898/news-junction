"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Share2, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { addBookmarkApi, addHistoryApi, removeBookmarkApi, getBookmarksApi } from "@/lib/personalization/client-api";
import toast from "react-hot-toast";
import {
  getNewsBySlug,
  getRelatedNews,
  incrementNewsViews,
  getLatestNews,
} from "@/firebase/firestore";
import { NewsArticle } from "@/types";
import {
  getArticleTitle,
  getArticleContent,
  formatRelativeTime,
  toDate,
} from "@/lib/utils";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd, getSiteUrl } from "@/lib/seo";
import NewsCard from "@/components/news/NewsCard";
import AdSlotRenderer from "@/components/ads/AdSlotRenderer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [related, setRelated] = useState<NewsArticle[]>([]);
  const [latest, setLatest] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [audioLang, setAudioLang] = useState<"hi" | "en">("hi");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [completedRead, setCompletedRead] = useState(false);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      try {
        const data = await getNewsBySlug(slug);
        if (!data || data.status !== "published") {
          setNotFound(true);
          return;
        }
        setArticle(data);
        incrementNewsViews(data.id).catch(() => {});

        const [relatedNews, latestNews] = await Promise.all([
          getRelatedNews(data.categoryId, data.id),
          getLatestNews(5),
        ]);
        setRelated(relatedNews);
        setLatest(latestNews.filter((a) => a.id !== data.id).slice(0, 4));
      } catch (error) {
        console.error("Failed to load article:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
  }, [slug]);

  useEffect(() => {
    setStartedAt(Date.now());
    setCompletedRead(false);
    const onScroll = () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height > 0 && scrolled / height > 0.72) setCompletedRead(true);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  useEffect(() => {
    if (!user || !article) return;
    (async () => {
      try {
        const res = (await getBookmarksApi()) as Record<string, unknown>;
        const items = ((res.items as Record<string, unknown>[]) || []).map((x) => String(x.articleId));
        setIsBookmarked(items.includes(article.id));
      } catch {
        setIsBookmarked(false);
      }
    })();
  }, [user, article]);

  useEffect(() => {
    return () => {
      if (!user || !article) return;
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      addHistoryApi({
        articleId: article.id,
        readingTimeSec: seconds,
        completed: completedRead,
        categoryId: article.categoryId,
        categoryName: language === "hi" ? article.categoryNameHi : article.categoryNameEn,
        topicTags: article.tags || [],
      }).catch(() => {});
    };
  }, [user, article, startedAt, completedRead, language]);

  useEffect(() => {
    if (!article) return;

    const title = getArticleTitle(article, language);
    const seoTitle =
      (language === "hi" ? article.seoTitleHi : article.seoTitleEn) ||
      article.seoTitle ||
      title;
    const description = (language === "hi" ? article.seoDescriptionHi : article.seoDescriptionEn) || article.seoDescription || (language === "hi" ? article.summaryHi : article.summaryEn);
    const canonicalUrl = article.canonicalUrl || `${getSiteUrl()}/article/${article.slug}`;

    document.title = `${seoTitle} | News Junction`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);

    const setMeta = (selector: string, content: string) => {
      let tag = document.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        if (selector.includes("property=")) {
          tag.setAttribute("property", selector.match(/"(.*)"/)?.[1] || "");
        } else {
          tag.setAttribute("name", selector.match(/"(.*)"/)?.[1] || "");
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    setMeta('meta[property="og:title"]', article.ogTitle || seoTitle);
    setMeta('meta[property="og:description"]', article.ogDescription || description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[name="twitter:title"]', article.twitterTitle || article.ogTitle || seoTitle);
    setMeta('meta[name="twitter:description"]', article.twitterDescription || article.ogDescription || description);

    const jsonLd = buildArticleJsonLd(article, language);
    let script = document.getElementById("article-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "article-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    const breadcrumbLd = buildBreadcrumbJsonLd(article, language);
    let breadcrumbScript = document.getElementById("breadcrumb-jsonld") as HTMLScriptElement | null;
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement("script");
      breadcrumbScript.id = "breadcrumb-jsonld";
      breadcrumbScript.type = "application/ld+json";
      document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbLd);

    const faqItems = article.seoFaqItems || [];
    if (faqItems.length > 0) {
      const faqLd = buildFaqJsonLd(article, language);
      let faqScript = document.getElementById("faq-jsonld") as HTMLScriptElement | null;
      if (!faqScript) {
        faqScript = document.createElement("script");
        faqScript.id = "faq-jsonld";
        faqScript.type = "application/ld+json";
        document.head.appendChild(faqScript);
      }
      faqScript.textContent = JSON.stringify(faqLd);
    }
  }, [article, language]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#1a2b4c]">Article Not Found</h1>
        <p className="mt-2 text-gray-500">
          {language === "hi" ? "यह खबर उपलब्ध नहीं है।" : "This article is not available."}
        </p>
        <Link href="/" className="mt-4 inline-block text-[#c41e20] hover:underline">
          {language === "hi" ? "होम पर जाएं" : "Go to Home"}
        </Link>
      </div>
    );
  }

  const title = getArticleTitle(article, language);
  const content = getArticleContent(article, language);
  const categoryName =
    language === "hi" ? article.categoryNameHi : article.categoryNameEn;
  const publishedDate = formatRelativeTime(toDate(article.publishedAt), language);
  const imageAlt = language === "hi" ? article.imageAltHi : article.imageAltEn;
  const shareUrl = `${getSiteUrl()}/article/${article.slug}`;
  const hasHiAudio =
    Boolean(article.audioHiUrl) &&
    ["approved", "published"].includes(String(article.audioStatusHi || ""));
  const hasEnAudio =
    Boolean(article.audioEnUrl) &&
    ["approved", "published"].includes(String(article.audioStatusEn || ""));
  const activeAudioUrl =
    audioLang === "hi" ? (hasHiAudio ? article.audioHiUrl : hasEnAudio ? article.audioEnUrl : "") : (hasEnAudio ? article.audioEnUrl : hasHiAudio ? article.audioHiUrl : "");

  const shareLinks = [
    {
      name: "Facebook",
      label: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Twitter",
      label: "X",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#c41e20]">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/category/${article.categoryId}`}
          className="hover:text-[#c41e20]"
        >
          {categoryName}
        </Link>
        <span className="mx-2">/</span>
        <span className="line-clamp-1 text-[#1a2b4c]">{title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-sm md:p-8">
            <span className="inline-block rounded bg-[#c41e20] px-2 py-0.5 text-xs font-bold uppercase text-white">
              {categoryName}
            </span>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-[#1a2b4c] md:text-4xl">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span>
                {t.by} <strong className="text-[#1a2b4c]">{article.author}</strong>
              </span>
              <span>·</span>
              <span>
                {t.publishedOn}: {publishedDate}
              </span>
              {article.views > 0 && (
                <>
                  <span>·</span>
                  <span>{article.views} views</span>
                </>
              )}
            </div>

            {article.imageUrl && (
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={article.imageUrl}
                  alt={imageAlt || title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            )}

            {(hasHiAudio || hasEnAudio) && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1a2b4c]">
                    {language === "hi" ? "यह खबर सुनें" : "Listen to this news"}
                  </p>
                  <div className="flex gap-2 text-xs">
                    {hasHiAudio && (
                      <button
                        className={`rounded px-2 py-1 ${audioLang === "hi" ? "bg-[#1a2b4c] text-white" : "bg-white border"}`}
                        onClick={() => setAudioLang("hi")}
                      >
                        Hindi
                      </button>
                    )}
                    {hasEnAudio && (
                      <button
                        className={`rounded px-2 py-1 ${audioLang === "en" ? "bg-[#1a2b4c] text-white" : "bg-white border"}`}
                        onClick={() => setAudioLang("en")}
                      >
                        English
                      </button>
                    )}
                  </div>
                </div>
                <audio controls className="w-full" controlsList="nodownload">
                  <source src={activeAudioUrl || undefined} type="audio/mpeg" />
                </audio>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 border-y border-gray-100 py-4">
              <Share2 size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">{t.share}:</span>
              {user && (
                <button
                  onClick={async () => {
                    if (!article) return;
                    try {
                      if (isBookmarked) {
                        await removeBookmarkApi(article.id);
                        setIsBookmarked(false);
                        toast.success("Bookmark removed");
                      } else {
                        await addBookmarkApi({
                          articleId: article.id,
                          title: title,
                          slug: article.slug,
                          categoryName: categoryName,
                          language,
                        });
                        setIsBookmarked(true);
                        toast.success("Bookmarked");
                      }
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Bookmark action failed");
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${isBookmarked ? "bg-[#1a2b4c] text-white" : "bg-white text-[#1a2b4c]"}`}
                >
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>
              )}
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-[#1a2b4c] transition-colors hover:bg-[#1a2b4c] hover:text-white"
                  aria-label={`Share on ${link.name}`}
                >
                  {link.icon ? <link.icon size={16} /> : link.label}
                </a>
              ))}
            </div>

            <div
              className="article-content mt-6 text-base leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{
                __html: content.replace(/\n/g, "<br />"),
              }}
            />

            <AdSlotRenderer location="inArticle" className="my-6" />

            {(article.seoInternalLinks || []).length > 0 && (
              <section className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <h2 className="text-lg font-semibold text-[#1a2b4c]">
                  {language === "hi" ? "संबंधित आंतरिक लिंक" : "Related Internal Links"}
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
                  {(article.seoInternalLinks || []).slice(0, 6).map((link) => (
                    <li key={`${link.suggestedArticleId}-${link.slug}`}>
                      <Link href={`/article/${link.slug}`} className="text-[#c41e20] hover:underline">
                        {language === "hi" ? link.anchorTextHi || link.titleHi : link.anchorTextEn || link.titleEn}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(article.seoFaqItems || []).length > 0 && (
              <section className="mt-8 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <h2 className="text-lg font-semibold text-[#1a2b4c]">FAQ</h2>
                <div className="mt-3 space-y-3">
                  {(article.seoFaqItems || []).map((item, idx) => (
                    <div key={idx}>
                      <p className="font-medium text-[#1a2b4c]">
                        {language === "hi" ? item.questionHi : item.questionEn}
                      </p>
                      <p className="text-sm text-gray-700">
                        {language === "hi" ? item.answerHi : item.answerEn}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {article.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {(article.sourceName || article.sourceUrl) && (
              <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-[#1a2b4c]">
                  {language === "hi" ? "स्रोत" : "Source"}
                </p>
                <p className="mt-1">
                  {article.sourceUrl ? (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#c41e20] hover:underline"
                    >
                      {article.sourceName || article.sourceUrl}
                    </a>
                  ) : (
                    article.sourceName
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {language === "hi"
                    ? "यह लेख सार्वजनिक रूप से उपलब्ध जानकारी के आधार पर मूल रूप से लिखा गया है।"
                    : "This article was originally written based on publicly available information."}
                </p>
              </div>
            )}
          </div>

          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-[#1a2b4c]">{t.relatedNews}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <NewsCard key={item.id} article={item} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-6">
          <AdSlotRenderer location="sidebar" />
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b-2 border-[#c41e20] pb-2 text-lg font-bold text-[#1a2b4c]">
              {t.latestNews}
            </h2>
            {latest.map((item) => (
              <NewsCard key={item.id} article={item} variant="hero-side" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
