import { Metadata } from "next";
import { NewsArticle } from "@/types";
import { BRAND } from "@/lib/constants";
import type { ArticleShareMeta } from "@/lib/news/get-article-for-metadata";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app").replace(
  /\/$/,
  ""
);

export function getSiteUrl(): string {
  return SITE_URL;
}

/** Absolute article image for Facebook / WhatsApp / X link previews. */
export function resolveShareImageUrl(article: {
  imageUrl?: string;
  imageLargeUrl?: string;
  imageWebpUrl?: string;
  imageMediumUrl?: string;
}): string {
  const raw =
    article.imageLargeUrl ||
    article.imageWebpUrl ||
    article.imageMediumUrl ||
    article.imageUrl ||
    "";
  const trimmed = String(raw || "").trim();
  if (!trimmed || trimmed === "/logo.png") {
    return `${SITE_URL}/logo.png`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.startsWith("/") ? `${SITE_URL}${trimmed}` : `${SITE_URL}/${trimmed}`;
}

/**
 * Google Search Console "HTML tag" verification gives a value like:
 *   <meta name="google-site-verification" content="abc123..." />
 * Admins may paste either the full tag or just the code — normalize to the raw code.
 */
function normalizeGoogleSiteVerification(raw?: string): string {
  const val = (raw || "").trim();
  if (!val) return "";
  const match = val.match(/content=["']([^"']+)["']/i);
  return (match ? match[1] : val).trim();
}

export function buildDefaultMetadata(options?: { googleSiteVerification?: string }): Metadata {
  const googleVerification = normalizeGoogleSiteVerification(options?.googleSiteVerification);

  const metadata: Metadata = {
    title: {
      default: `${BRAND.name} - ${BRAND.taglineHi} | ${BRAND.taglineEn}`,
      template: `%s | ${BRAND.name}`,
    },
    description: `${BRAND.name} - Your trusted bilingual news source. ${BRAND.taglineHi} | ${BRAND.taglineEn}`,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      type: "website",
      locale: "hi_IN",
      alternateLocale: "en_US",
      siteName: BRAND.name,
      title: BRAND.name,
      description: `${BRAND.taglineHi} | ${BRAND.taglineEn}`,
      images: [{ url: `${SITE_URL}/logo.png`, width: 512, height: 512, alt: BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND.name,
      description: `${BRAND.taglineHi} | ${BRAND.taglineEn}`,
      images: [`${SITE_URL}/logo.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon-96.png"],
    },
  };

  if (googleVerification) {
    metadata.verification = { google: googleVerification };
  }

  return metadata;
}

function buildShareMetadataFromFields(args: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  imageAlt: string;
  publishedTime?: string;
  authors: string[];
  tags: string[];
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}): Metadata {
  const {
    title,
    description,
    url,
    imageUrl,
    imageAlt,
    publishedTime,
    authors,
    tags,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
  } = args;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: ogTitle || title,
      description: ogDescription || description,
      url,
      siteName: BRAND.name,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      publishedTime,
      authors,
      tags,
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle || ogTitle || title,
      description: twitterDescription || ogDescription || description,
      images: [imageUrl],
    },
  };
}

export function buildArticleMetadata(
  article: NewsArticle,
  language: "hi" | "en" = "hi"
): Metadata {
  const title =
    (language === "hi" ? article.seoTitleHi : article.seoTitleEn) ||
    (language === "hi" ? article.titleHi : article.titleEn);
  const description =
    (language === "hi" ? article.seoDescriptionHi : article.seoDescriptionEn) ||
    (language === "hi" ? article.summaryHi : article.summaryEn);
  const url = `${SITE_URL}/article/${article.slug}`;
  const imageUrl = resolveShareImageUrl(article);
  const publishedTime = article.publishedAt?.toDate?.()?.toISOString();

  return buildShareMetadataFromFields({
    title,
    description,
    url,
    imageUrl,
    imageAlt: title,
    publishedTime,
    authors: [article.author],
    tags: article.tags,
    ogTitle: article.ogTitle || undefined,
    ogDescription: article.ogDescription || undefined,
    twitterTitle: article.twitterTitle || undefined,
    twitterDescription: article.twitterDescription || undefined,
  });
}

/** Metadata from server Firestore fetch (for generateMetadata). */
export function buildArticleShareMetadata(
  article: ArticleShareMeta,
  language: "hi" | "en" = "hi"
): Metadata {
  const title =
    (language === "hi" ? article.seoTitleHi : article.seoTitleEn) ||
    (language === "hi" ? article.titleHi : article.titleEn) ||
    "News Junction";
  const description =
    (language === "hi" ? article.seoDescriptionHi : article.seoDescriptionEn) ||
    (language === "hi" ? article.summaryHi : article.summaryEn) ||
    "";
  const url = `${SITE_URL}/article/${article.slug}`;
  const imageUrl = resolveShareImageUrl(article);

  return buildShareMetadataFromFields({
    title,
    description,
    url,
    imageUrl,
    imageAlt: title,
    publishedTime: article.publishedAtIso,
    authors: [article.author],
    tags: article.tags,
    ogTitle: article.ogTitle,
    ogDescription: article.ogDescription,
    twitterTitle: article.twitterTitle,
    twitterDescription: article.twitterDescription,
  });
}

export function buildArticleJsonLd(article: NewsArticle, language: "hi" | "en" = "hi") {
  const title = language === "hi" ? article.titleHi : article.titleEn;
  const description = language === "hi" ? article.summaryHi : article.summaryEn;
  const image = resolveShareImageUrl(article);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: image ? [image] : [],
    datePublished: article.publishedAt?.toDate?.()?.toISOString(),
    dateModified: article.updatedAt?.toDate?.()?.toISOString(),
    author: {
      "@type": "Organization",
      name: article.author || "News Junction Team",
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/article/${article.slug}`,
    },
  };
}

export function buildBreadcrumbJsonLd(article: NewsArticle, language: "hi" | "en" = "hi") {
  const categoryName = language === "hi" ? article.categoryNameHi : article.categoryNameEn;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: categoryName, item: `${SITE_URL}/category/${article.categoryId}` },
      {
        "@type": "ListItem",
        position: 3,
        name: language === "hi" ? article.titleHi : article.titleEn,
        item: `${SITE_URL}/article/${article.slug}`,
      },
    ],
  };
}

export function buildFaqJsonLd(article: NewsArticle, language: "hi" | "en" = "hi") {
  const faq = article.seoFaqItems || [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: language === "hi" ? item.questionHi : item.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: language === "hi" ? item.answerHi : item.answerEn,
      },
    })),
  };
}

export function buildCategoryMetadata(
  nameHi: string,
  nameEn: string,
  slug: string,
  language: "hi" | "en" = "hi"
): Metadata {
  const name = language === "hi" ? nameHi : nameEn;
  const url = `${SITE_URL}/category/${slug}`;

  return {
    title: name,
    description: `${name} - Latest news on ${BRAND.name}`,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} | ${BRAND.name}`,
      description: `${name} - Latest news on ${BRAND.name}`,
      url,
    },
  };
}
