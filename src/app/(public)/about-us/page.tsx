import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PolicyPageView from "@/components/trust/PolicyPageView";
import {
  getSitePageServer,
  getTrustConfigServer,
  getAboutStatsServer,
  buildPolicyMetadata,
} from "@/lib/trust/server";
import { getSiteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/constants";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePageServer("about-us");
  return buildPolicyMetadata(page);
}

export default async function AboutUsPage() {
  const [page, config, stats] = await Promise.all([
    getSitePageServer("about-us"),
    getTrustConfigServer(),
    getAboutStatsServer(),
  ]);
  if (!page.published) notFound();

  // Organization structured data — only with verified, configured details.
  const orgLd =
    config.legalEntityName || config.siteOwnerName
      ? {
          "@context": "https://schema.org",
          "@type": "NewsMediaOrganization",
          name: BRAND.name,
          legalName: config.legalEntityName || undefined,
          founder: config.founderName || undefined,
          url: getSiteUrl(),
          logo: `${getSiteUrl()}/logo.png`,
          email: config.generalEmail || undefined,
        }
      : null;

  return (
    <>
      {orgLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
      ) : null}
      <PolicyPageView page={page} variant="about" config={config} aboutStats={stats} />
    </>
  );
}
