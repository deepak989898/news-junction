"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminTopbar from "@/components/layout/AdminTopbar";
import NewsForm from "@/components/admin/NewsForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getNewsById, updateNews, getAllCategories } from "@/firebase/firestore";
import { NewsFormData, Category } from "@/types";
import { analyzeArticleSubject } from "@/lib/image-pipeline/analysis";

export default function EditNewsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [initialData, setInitialData] = useState<NewsFormData | null>(null);
  const [imageMeta, setImageMeta] = useState<{
    imageOrigin?: string;
    imageCredit?: string;
    imageLicence?: string;
    imageRelevanceScore?: number;
    imageQualityScore?: number;
    imagePrompt?: string;
    imageStatus?: string;
    isRealPersonPrimary?: boolean;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getNewsById(id), getAllCategories()])
      .then(([article, cats]) => {
        if (!article) { router.push("/admin/news"); return; }
        setCategories(cats);
        setInitialData({
          titleHi: article.titleHi,
          titleEn: article.titleEn,
          slug: article.slug,
          summaryHi: article.summaryHi,
          summaryEn: article.summaryEn,
          contentHi: article.contentHi,
          contentEn: article.contentEn,
          categoryId: article.categoryId,
          imageUrl: article.imageUrl,
          imageAltHi: article.imageAltHi,
          imageAltEn: article.imageAltEn,
          author: article.author,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
          tags: article.tags.join(", "),
          status: article.status,
          isBreaking: article.isBreaking,
          isFeatured: article.isFeatured,
          isTrending: article.isTrending,
          seoTitle: article.seoTitle || "",
          seoDescription: article.seoDescription || "",
          canonicalUrl: article.canonicalUrl || "",
          scheduledPublishAt: article.scheduledPublishAt?.toDate?.()
            ? article.scheduledPublishAt.toDate().toISOString().slice(0, 16)
            : "",
        });
        const analysis = analyzeArticleSubject({
          articleId: article.id,
          rawNewsId: "",
          titleHi: article.titleHi,
          titleEn: article.titleEn,
          summaryHi: article.summaryHi,
          summaryEn: article.summaryEn,
          categoryId: article.categoryId,
          categoryNameEn: article.categoryNameEn,
          categoryNameHi: article.categoryNameHi,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
          originalLink: article.sourceUrl,
          originalImage: article.imageOriginalUrl || "",
        });
        setImageMeta({
          imageOrigin: article.imageOrigin,
          imageCredit: article.imageCredit,
          imageLicence: article.imageLicence,
          imageRelevanceScore: article.imageRelevanceScore,
          imageQualityScore: article.imageQualityScore,
          imagePrompt: article.imagePrompt,
          imageStatus: article.imageStatus,
          isRealPersonPrimary: analysis.isRealPersonPrimary,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (data: NewsFormData) => {
    const category = categories.find((c) => c.id === data.categoryId) || categories[1];
    await updateNews(id, data, category);
    router.push("/admin/news");
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!initialData) return null;

  return (
    <div>
      <AdminTopbar title="Edit News" />
      <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
        <NewsForm
          initialData={initialData}
          articleId={id}
          imageMeta={imageMeta || undefined}
          onSubmit={handleSubmit}
          submitLabel="Update Article"
        />
      </div>
    </div>
  );
}
