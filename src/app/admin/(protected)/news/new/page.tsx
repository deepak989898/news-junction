"use client";

import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/layout/AdminTopbar";
import NewsForm from "@/components/admin/NewsForm";
import { createNews, getAllCategories } from "@/firebase/firestore";
import { NewsFormData, Category } from "@/types";
import { useEffect, useState } from "react";

export default function AddNewsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  const handleSubmit = async (data: NewsFormData) => {
    const category = categories.find((c) => c.id === data.categoryId) || categories[1];
    await createNews(data, category);
    router.push("/admin/news");
  };

  return (
    <div>
      <AdminTopbar title="Add New News" />
      <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
        <NewsForm onSubmit={handleSubmit} submitLabel="Publish Article" />
      </div>
    </div>
  );
}
