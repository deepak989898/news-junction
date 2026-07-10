"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Sparkles } from "lucide-react";
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
import { RECOMMENDED_NEWS_SOURCES } from "@/lib/automation/recommended-sources";
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [src, cats] = await Promise.all([getAllSources(), getAllCategories()]);
      setSources(src);
      setCategories(cats.filter((c) => c.slug !== "home"));
    } catch {
      toast.error("Failed to load sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredSources = useMemo(() => {
    if (categoryFilter === "all") return sources;
    return sources.filter((s) => s.categoryId === categoryFilter);
  }, [sources, categoryFilter]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, NewsSource[]> = {};
    filteredSources.forEach((src) => {
      const key = src.categoryId || "uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(src);
    });
    return groups;
  }, [filteredSources]);

  const openCreate = (categoryId?: string) => {
    setEditing(null);
    setForm(categoryId ? { ...emptySource, categoryId } : emptySource);
    setShowForm(true);
  };

  const openEdit = (src: NewsSource) => {
    setEditing(src);
    setForm({
      name: src.name,
      type: src.type,
      url: src.url,
      language: src.language,
      categoryId: src.categoryId,
      isActive: src.isActive,
      trustLevel: src.trustLevel,
      autoPublishAllowed: src.autoPublishAllowed,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
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
    try {
      await deleteSource(deleteId);
      toast.success("Source deleted");
      setDeleteId(null);
      await load();
    } catch {
      toast.error("Failed to delete source");
    }
  };

  const handleSeedRecommended = async () => {
    if (adminUser?.role !== "super_admin") {
      toast.error("Only super admin can add recommended sources");
      return;
    }
    setSeeding(true);
    try {
      const existingUrls = new Set(sources.map((s) => s.url.trim().toLowerCase()));
      let added = 0;
      for (const item of RECOMMENDED_NEWS_SOURCES) {
        if (existingUrls.has(item.url.trim().toLowerCase())) continue;
        await createSource({
          ...item,
          isActive: true,
          autoPublishAllowed: false,
        });
        added++;
      }
      toast.success(added ? `Added ${added} recommended sources` : "All recommended sources already exist");
      await load();
    } catch {
      toast.error("Failed to add recommended sources");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <RoleGuard>
      <AdminTopbar
        title="Source Management"
        actions={
          <div className="flex flex-wrap gap-2">
            {adminUser?.role === "super_admin" && (
              <button
                type="button"
                onClick={handleSeedRecommended}
                disabled={seeding}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1a2b4c] px-4 py-2 text-sm font-medium text-[#1a2b4c] disabled:opacity-50"
              >
                <Sparkles size={16} />
                {seeding ? "Adding..." : "Add Recommended Sources"}
              </button>
            )}
            <button
              type="button"
              onClick={() => openCreate(categoryFilter !== "all" ? categoryFilter : undefined)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus size={16} /> Add Source
            </button>
          </div>
        }
      />

      <p className="mb-4 text-sm text-gray-500">
        Har category ke liye RSS sources add, edit ya delete karein. Auto publish band rakhein — articles approval queue mein jayenge.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Filter by category:</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All Categories ({sources.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameHi} / {c.nameEn} ({sources.filter((s) => s.categoryId === c.id).length})
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold">{editing ? "Edit Source" : "Add Source"}</h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <FormInput label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                <option value="RSS">RSS</option>
                <option value="Official">Official</option>
                <option value="Manual">Manual</option>
                <option value="GDELT">GDELT</option>
              </select>
            </div>
            <FormInput label="RSS / Feed URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} type="url" required className="md:col-span-2" />
            <div>
              <label className="mb-1 block text-sm font-medium">Language</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as SourceLanguage })} className="w-full rounded-lg border px-4 py-2.5 text-sm">
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category *</label>
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
            <ToggleSwitch label="Auto Publish Allowed" checked={form.autoPublishAllowed} onChange={(v) => setForm({ ...form, autoPublishAllowed: v })} />
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="rounded-lg bg-[#1a2b4c] px-6 py-2 text-sm font-bold text-white">Save Source</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-6 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {filteredSources.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">No sources in this category yet.</p>
          <button
            type="button"
            onClick={() => openCreate(categoryFilter !== "all" ? categoryFilter : undefined)}
            className="mt-4 rounded-lg bg-[#c41e20] px-4 py-2 text-sm font-bold text-white"
          >
            Add First Source
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([categoryId, items]) => {
            const cat = categoryMap[categoryId];
            return (
              <div key={categoryId} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                  <h3 className="font-bold text-[#1a2b4c]">
                    {cat ? `${cat.nameHi} / ${cat.nameEn}` : categoryId}
                  </h3>
                  <button
                    type="button"
                    onClick={() => openCreate(categoryId)}
                    className="text-sm font-medium text-[#c41e20] hover:underline"
                  >
                    + Add to this category
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">URL</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Language</th>
                      <th className="px-4 py-3 font-semibold">Trust</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((src) => (
                      <tr key={src.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{src.name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[#c41e20]">
                            {src.url}
                            <ExternalLink size={12} />
                          </a>
                        </td>
                        <td className="px-4 py-3">{src.type}</td>
                        <td className="px-4 py-3">{src.language}</td>
                        <td className="px-4 py-3 capitalize">{src.trustLevel}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={src.isActive ? "active" : "draft"} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openEdit(src)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50" title="Edit">
                              <Pencil size={16} />
                            </button>
                            {canDeleteSource(adminUser?.role) && (
                              <button type="button" onClick={() => setDeleteId(src.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal open={!!deleteId} title="Delete Source" message="Delete this source? Automation will stop fetching from it." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </RoleGuard>
  );
}
