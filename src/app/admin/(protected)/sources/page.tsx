"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminTopbar from "@/components/layout/AdminTopbar";
import RoleGuard from "@/components/admin/RoleGuard";
import FormInput from "@/components/admin/FormInput";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import ConfirmModal from "@/components/admin/ConfirmModal";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getAllSources, createSource, updateSource, deleteSource, getAllCategories,
} from "@/firebase/firestore";
import { NewsSource, SourceType, SourceLanguage, TrustLevel, Category } from "@/types";
import { canDeleteSource } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const emptySource = {
  name: "", type: "RSS" as SourceType, url: "", language: "Both" as SourceLanguage,
  categoryId: "desh", isActive: true, trustLevel: "medium" as TrustLevel, autoPublishAllowed: false,
};

export default function SourcesPage() {
  const { adminUser } = useAuth();
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NewsSource | null>(null);
  const [form, setForm] = useState(emptySource);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const [src, cats] = await Promise.all([getAllSources(), getAllCategories()]);
    setSources(src);
    setCategories(cats.filter((c) => c.slug !== "home"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateSource(editing.id, form);
        toast.success("Source updated");
      } else {
        await createSource(form);
        toast.success("Source created");
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error("Failed to save source");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSource(deleteId);
    toast.success("Source deleted");
    setDeleteId(null);
    await load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="Source Management"
        actions={
          <button onClick={() => { setEditing(null); setForm(emptySource); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} /> Add Source
          </button>
        }
      />

          <p className="mb-4 text-sm text-gray-500">Manage RSS, Official, Manual, and GDELT sources for automation. Only title and summary are fetched — full articles are never copied.</p>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold">{editing ? "Edit" : "Add"} Source</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <FormInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                <option value="RSS">RSS</option>
                <option value="Official">Official</option>
                <option value="Manual">Manual</option>
                <option value="GDELT">GDELT</option>
              </select>
            </div>
            <FormInput label="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} type="url" required />
            <div>
              <label className="mb-1 block text-sm font-medium">Language</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as SourceLanguage })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameHi} / {c.nameEn}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Trust Level</label>
              <select value={form.trustLevel} onChange={(e) => setForm({ ...form, trustLevel: e.target.value as TrustLevel })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <ToggleSwitch label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <ToggleSwitch label="Auto Publish Allowed (Phase 3)" checked={form.autoPublishAllowed} onChange={(v) => setForm({ ...form, autoPublishAllowed: v })} />
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="rounded-lg bg-[#1a2b4c] px-6 py-2 text-sm font-bold text-white">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-6 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {sources.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No sources yet. Add RSS feeds for Phase 3.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Language</th>
                <th className="px-4 py-3 font-semibold">Trust</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{src.name}</td>
                  <td className="px-4 py-3">{src.type}</td>
                  <td className="px-4 py-3">{src.language}</td>
                  <td className="px-4 py-3 capitalize">{src.trustLevel}</td>
                  <td className="px-4 py-3"><StatusBadge status={src.isActive ? "active" : "draft"} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(src); setForm({ name: src.name, type: src.type, url: src.url, language: src.language, categoryId: src.categoryId, isActive: src.isActive, trustLevel: src.trustLevel, autoPublishAllowed: src.autoPublishAllowed }); setShowForm(true); }} className="rounded p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={16} /></button>
                      {canDeleteSource(adminUser?.role) && (
                        <button onClick={() => setDeleteId(src.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal open={!!deleteId} title="Delete Source" message="Delete this source?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </RoleGuard>
  );
}
