import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PolicyPageView from "@/components/trust/PolicyPageView";
import { getSitePageServer, getTrustConfigServer, buildPolicyMetadata } from "@/lib/trust/server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePageServer("terms-and-conditions");
  return buildPolicyMetadata(page);
}

export default async function TermsAndConditionsPage() {
  const [page, config] = await Promise.all([
    getSitePageServer("terms-and-conditions"),
    getTrustConfigServer(),
  ]);
  if (!page.published) notFound();
  return <PolicyPageView page={page} variant="terms" config={config} />;
}
