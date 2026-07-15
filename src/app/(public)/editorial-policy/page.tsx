import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PolicyPageView from "@/components/trust/PolicyPageView";
import { getSitePageServer, buildPolicyMetadata } from "@/lib/trust/server";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSitePageServer("editorial-policy");
  return buildPolicyMetadata(page);
}

export default async function EditorialPolicyPage() {
  const page = await getSitePageServer("editorial-policy");
  if (!page.published) notFound();
  return <PolicyPageView page={page} />;
}
