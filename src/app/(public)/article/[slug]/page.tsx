import type { Metadata } from "next";
import { getArticleShareMetaBySlug } from "@/lib/news/get-article-for-metadata";
import { buildArticleShareMetadata } from "@/lib/seo";
import ArticleClient from "./ArticleClient";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleShareMetaBySlug(slug);
  if (!article) {
    return {
      title: "Article",
      robots: { index: false, follow: true },
    };
  }
  return buildArticleShareMetadata(article, "hi");
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  return <ArticleClient key={slug} />;
}
