"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import FormInput from "@/components/admin/FormInput";
import FormTextarea from "@/components/admin/FormTextarea";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import ConfirmModal from "@/components/admin/ConfirmModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  isCategorySlugTaken,
  seedDefaultCategories,
} from "@/firebase/firestore";
import { Category } from "@/types";
import { createSlug } from "@/lib/utils";
import { canDeleteCategory } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const emptyForm = {
  nameHi: "", nameEn: "", slug: "", descriptionHi: "", descriptionEn: "", isActive: true, order: 0,
};

export default function CategoriesPage() {
  const { adminUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      await seedDefaultCategories();
      const data = await getAllCategories();
      setCategories(data.filter((c) => c.slug !== "home"));
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: categories.length + 1 });
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      nameHi: cat.nameHi, nameEn: cat.nameEn, slug: cat.slug,
      descriptionHi: cat.descriptionHi || "", descriptionEn: cat.descriptionEn || "",
      isActive: cat.isActive, order: cat.order,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const slug = form.slug || createSlug(form.nameEn);
    const taken = await isCategorySlugTaken(slug, editing?.id);
    if (taken) { toast.error("Slug already exists"); return; }

    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { ...form, slug });
        toast.success("Category updated");
      } else {
        await createCategory({ ...form, slug });
        toast.success("Category created");
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCategory(deleteId);
      toast.success("Category deleted");
      setDeleteId(null);
      await load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="Category Management"
        actions={
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} /> Add Category
          </button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-[#1a2b4c]">{editing ? "Edit" : "Add"} Category</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Name (Hindi)" value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} required />
              <FormInput label="Name (English)" value={form.nameEn} onChange={(e) => {
                const nameEn = e.target.value;
                setForm({ ...form, nameEn, slug: editing ? form.slug : createSlug(nameEn) });
              }} required />
            </div>
            <FormInput label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            <div className="grid gap-4 md:grid-cols-2">
              <FormTextarea label="Description (Hindi)" value={form.descriptionHi} onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })} rows={2} />
              <FormTextarea label="Description (English)" value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
              <ToggleSwitch label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="rounded-lg bg-[#1a2b4c] px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-6 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Order</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Name (HI/EN)</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Slug</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <GripVertical size={14} />
                    {cat.order}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{cat.nameHi}</p>
                  <p className="text-xs text-gray-500">{cat.nameEn}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{cat.slug}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={cat.isActive ? "active" : "draft"} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(cat)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                    {canDeleteCategory(adminUser?.role) && (
                      <button onClick={() => setDeleteId(cat.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal open={!!deleteId} title="Delete Category" message="Delete this category? Articles using it will keep their category name." confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </RoleGuard>
  );
}
