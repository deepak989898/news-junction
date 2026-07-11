import { Metadata } from "next";
import { NewsArticle } from "@/types";
import { BRAND } from "@/lib/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://newsjunction.vercel.app";

export function getSiteUrl(): string {
  return SITE_URL;
}

export function buildDefaultMetadata(): Metadata {
  return {
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
      images: [{ url: "/logo.png", width: 512, height: 512, alt: BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND.name,
      description: `${BRAND.taglineHi} | ${BRAND.taglineEn}`,
      images: ["/logo.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon.ico"],
    },
  };
}

export function buildArticleMetadata(
  article: NewsArticle,
  language: "hi" | "en" = "hi"
): Metadata {
  const title = language === "hi" ? article.titleHi : article.titleEn;
  const description = language === "hi" ? article.summaryHi : article.summaryEn;
  const url = `${SITE_URL}/article/${article.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images: article.imageUrl ? [{ url: article.imageUrl, alt: title }] : [],
      publishedTime: article.publishedAt?.toDate?.()?.toISOString(),
      authors: [article.author],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

export function buildArticleJsonLd(article: NewsArticle, language: "hi" | "en" = "hi") {
  const title = language === "hi" ? article.titleHi : article.titleEn;
  const description = language === "hi" ? article.summaryHi : article.summaryEn;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description,
    image: article.imageUrl ? [article.imageUrl] : [],
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
