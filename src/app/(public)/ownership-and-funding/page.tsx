import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PolicyPageView from "@/components/trust/PolicyPageView";
import { getSitePageServer, getTrustConfigServer, buildPolicyMetadata } from "@/lib/trust/server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePageServer("ownership-and-funding");
  return buildPolicyMetadata(page);
}

export default async function OwnershipFundingPage() {
  const [page, config] = await Promise.all([
    getSitePageServer("ownership-and-funding"),
    getTrustConfigServer(),
  ]);
  if (!page.published) notFound();
  return <PolicyPageView page={page} variant="ownership" config={config} />;
}
