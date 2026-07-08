import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/admin"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
