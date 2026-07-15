import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AuthorProfile from "@/components/trust/AuthorProfile";
import {
  getAuthorBySlugServer,
  getAuthorArticlesServer,
} from "@/lib/trust/server";
import { getSiteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlugServer(slug);
  if (!author || !author.isActive) {
    return { title: "Author", robots: { index: false, follow: true } };
  }
  const name = author.nameEn || author.nameHi;
  const url = `${getSiteUrl()}/authors/${author.slug}`;
  const description = author.bioEn || author.bioHi || `${name} — ${BRAND.name}`;
  return {
    title: `${name} | ${BRAND.name}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: `${name} | ${BRAND.name}`,
      description,
      url,
      siteName: BRAND.name,
      images: author.profileImageUrl ? [{ url: author.profileImageUrl }] : undefined,
    },
  };
}

export default async function AuthorProfilePage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlugServer(slug);
  if (!author || !author.isActive) notFound();

  const articles = await getAuthorArticlesServer(author, 12);

  // Person schema ONLY for real human authors (never for AI/team/system profiles).
  const personLd =
    author.authorType === "human" || author.authorType === "guest"
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: author.nameEn || author.nameHi,
          jobTitle: author.roleEn || author.roleHi || undefined,
          description: author.bioEn || author.bioHi || undefined,
          image: author.profileImageUrl || undefined,
          url: `${getSiteUrl()}/authors/${author.slug}`,
          worksFor: { "@type": "Organization", name: BRAND.name },
        }
      : null;

  return (
    <>
      {personLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
      ) : null}
      <AuthorProfile author={author} articles={articles} />
    </>
  );
}
