import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

async function getPublishedArticleUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const snapshot = await getAdminDb()
      .collection("news")
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(500)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const slug = String(data.slug || doc.id);
      const publishedAt = data.publishedAt?.toDate?.() || new Date();
      return {
        url: `${siteUrl}/article/${slug}`,
        lastModified: publishedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      };
    });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const articlePages = await getPublishedArticleUrls(siteUrl);

  return [...staticPages, ...categoryPages, ...articlePages];
}
