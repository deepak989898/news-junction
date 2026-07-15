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

/** Published trust/policy pages + contact + authors directory. */
async function getPolicyAndAuthorUrls(siteUrl: string, now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const { POLICY_PAGES } = await import("@/lib/trust/page-config");
    const { getSitePageServer, getAuthorsServer } = await import("@/lib/trust/server");

    const policyEntries = await Promise.all(
      POLICY_PAGES.map(async (meta) => {
        const page = await getSitePageServer(meta.key);
        if (!page.published) return null;
        return {
          url: `${siteUrl}${meta.path}`,
          lastModified: page.lastUpdatedAt ? new Date(page.lastUpdatedAt) : now,
          changeFrequency: "monthly" as const,
          priority: 0.4,
        };
      })
    );

    const staticTrust: MetadataRoute.Sitemap = [
      { url: `${siteUrl}/contact-us`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
      { url: `${siteUrl}/authors`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    ];

    const authors = await getAuthorsServer({ activeOnly: true });
    const authorEntries: MetadataRoute.Sitemap = authors.map((a) => ({
      url: `${siteUrl}/authors/${a.slug}`,
      lastModified: a.updatedAt ? new Date(a.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    }));

    return [
      ...(policyEntries.filter(Boolean) as MetadataRoute.Sitemap),
      ...staticTrust,
      ...authorEntries,
    ];
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

  const [articlePages, policyAndAuthorPages] = await Promise.all([
    getPublishedArticleUrls(siteUrl),
    getPolicyAndAuthorUrls(siteUrl, now),
  ]);

  return [...staticPages, ...categoryPages, ...policyAndAuthorPages, ...articlePages];
}
