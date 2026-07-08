import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  const categoryPages: MetadataRoute.Sitemap = DEFAULT_CATEGORIES.filter(
    (c) => c.slug !== "home"
  ).map((cat) => ({
    url: `${siteUrl}/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages];
}
