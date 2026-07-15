import type { Metadata } from "next";
import AuthorsDirectory from "@/components/trust/AuthorsDirectory";
import { getAuthorsServer, getAuthorArticleCountServer } from "@/lib/trust/server";
import { getSiteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Authors | हमारे लेखक",
  description: `Meet the editorial team and contributors behind ${BRAND.name}.`,
  alternates: { canonical: `${getSiteUrl()}/authors` },
  openGraph: {
    title: `Authors | ${BRAND.name}`,
    description: `Meet the editorial team and contributors behind ${BRAND.name}.`,
    url: `${getSiteUrl()}/authors`,
    siteName: BRAND.name,
  },
};

export default async function AuthorsPage() {
  const authors = await getAuthorsServer({ activeOnly: true });
  const withCounts = await Promise.all(
    authors.map(async (a) => ({ ...a, articleCount: await getAuthorArticleCountServer(a) }))
  );
  return <AuthorsDirectory authors={withCounts} />;
}
